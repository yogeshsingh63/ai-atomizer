import os
import httpx
import logging
from typing import Optional
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db import get_db
from app.models import User
from app.schemas import TokenResponse, UserResponse
from app.services.auth import create_access_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")
CLIENT_REDIRECT_URI = os.getenv("CLIENT_REDIRECT_URI", "http://localhost:3000")

@router.post("/guest", response_model=TokenResponse)
async def continue_as_guest(db: AsyncSession = Depends(get_db)):
    """
    Creates a temporary guest user account and issues a JWT token.
    Allows testing the content ingestion pipeline without logging in.
    """
    try:
        # Create a new guest user record
        # A project count or timestamp can be appended to differentiate names
        guest_user = User(
            name="Guest User",
            email=None,
            is_guest=True,
            avatar_url=None
        )
        db.add(guest_user)
        await db.commit()
        await db.refresh(guest_user)

        # Issue token
        token = create_access_token(user_id=guest_user.id, is_guest=True)
        
        user_response = UserResponse.model_validate(guest_user)
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=user_response
        )
    except Exception as e:
        logger.error(f"Failed to create guest session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate guest session."
        )

@router.get("/google")
async def google_login():
    """
    Constructs and redirects the client to the Google OAuth 2.0 authorization page.
    """
    if not GOOGLE_CLIENT_ID or GOOGLE_CLIENT_ID.startswith("your-"):
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured. Please use Guest Login."
        )
        
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account"
    }
    google_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return RedirectResponse(google_url)

@router.get("/google/callback")
async def google_callback(
    code: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    OAuth 2.0 redirect callback endpoint. Receives code from Google,
    exchanges it for profile details, registers/updates user, and redirects back to client.
    """
    if error:
        logger.warning(f"Google login returned error from consent: {error}")
        return RedirectResponse(f"{CLIENT_REDIRECT_URI}/?auth_error=ConsentDenied")

    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code.")

    # 1. Exchange authorization code for tokens
    try:
        async with httpx.AsyncClient() as client:
            token_url = "https://oauth2.googleapis.com/token"
            token_data = {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": GOOGLE_REDIRECT_URI
            }
            token_res = await client.post(token_url, data=token_data)
            if token_res.status_code != 200:
                logger.error(f"Failed to exchange OAuth code: {token_res.text}")
                return RedirectResponse(f"{CLIENT_REDIRECT_URI}/?auth_error=TokenExchangeFailed")
            
            tokens = token_res.json()
            access_token = tokens.get("access_token")
            
            # 2. Retrieve user profile info using the access token
            userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
            userinfo_res = await client.get(userinfo_url, headers={"Authorization": f"Bearer {access_token}"})
            if userinfo_res.status_code != 200:
                logger.error(f"Failed to fetch Google profile: {userinfo_res.text}")
                return RedirectResponse(f"{CLIENT_REDIRECT_URI}/?auth_error=ProfileFetchFailed")
            
            profile = userinfo_res.json()
            email = profile.get("email")
            name = profile.get("name", "Google User")
            picture = profile.get("picture")
            
            if not email:
                return RedirectResponse(f"{CLIENT_REDIRECT_URI}/?auth_error=EmailMissing")

            # 3. Create or update user row in database
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalars().first()
            
            if user is None:
                user = User(
                    email=email,
                    name=name,
                    avatar_url=picture,
                    is_guest=False
                )
                db.add(user)
            else:
                user.name = name
                user.avatar_url = picture
                
            await db.commit()
            await db.refresh(user)
            
            # 4. Generate JWT and redirect user to Client App
            jwt_token = create_access_token(user_id=user.id, is_guest=False)
            return RedirectResponse(f"{CLIENT_REDIRECT_URI}/?token={jwt_token}")
            
    except Exception as e:
        logger.error(f"OAuth callback pipeline crash: {e}")
        return RedirectResponse(f"{CLIENT_REDIRECT_URI}/?auth_error=CallbackFailure")
