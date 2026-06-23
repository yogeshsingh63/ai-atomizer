import os
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db import get_db
from app.models import User
from app.schemas import TokenResponse, UserResponse
from app.services.auth import create_access_token, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

# OAuth configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
CLIENT_REDIRECT_URI = os.getenv("CLIENT_REDIRECT_URI", "http://localhost:3000")


@router.post("/guest", response_model=TokenResponse)
async def continue_as_guest(db: AsyncSession = Depends(get_db)):
    """
    Creates a temporary guest user account and issues a JWT token.
    Allows testing the content ingestion pipeline without logging in.
    """
    try:
        guest_user = User(
            name="Guest User",
            email=None,
            is_guest=True,
            avatar_url=None
        )
        db.add(guest_user)
        await db.commit()
        await db.refresh(guest_user)

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


@router.get("/google/login")
async def google_login():
    """Redirects the user to the Google OAuth consent screen."""
    if not GOOGLE_CLIENT_ID or not GOOGLE_REDIRECT_URI:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google OAuth is not configured on the backend. Please check GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI environment variables."
        )
    
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent"
    }
    query_string = "&".join(f"{k}={v}" for k, v in params.items())
    authorization_url = f"https://accounts.google.com/o/oauth2/v2/auth?{query_string}"
    return RedirectResponse(url=authorization_url)


@router.get("/google/callback")
async def google_callback(
    code: Optional[str] = None,
    error: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Handles Google OAuth redirect callback.
    Exchanges authorization code for tokens, retrieves user profile,
    and returns user session with JWT redirected back to frontend.
    """
    if error:
        logger.error(f"Google OAuth callback error: {error}")
        return RedirectResponse(url=f"{CLIENT_REDIRECT_URI}/new?auth_error={error}")
    
    if not code:
        logger.error("Google OAuth callback missing code parameter")
        return RedirectResponse(url=f"{CLIENT_REDIRECT_URI}/new?auth_error=missing_code")

    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET or not GOOGLE_REDIRECT_URI:
        logger.error("Google OAuth variables are missing on the backend")
        return RedirectResponse(url=f"{CLIENT_REDIRECT_URI}/new?auth_error=backend_misconfigured")

    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code"
    }

    try:
        import httpx
        async with httpx.AsyncClient() as client:
            token_res = await client.post(token_url, data=data)
            if token_res.status_code != 200:
                logger.error(f"Failed to exchange authorization code: {token_res.text}")
                return RedirectResponse(url=f"{CLIENT_REDIRECT_URI}/new?auth_error=token_exchange_failed")
            
            token_data = token_res.json()
            access_token = token_data.get("access_token")
            if not access_token:
                logger.error("No access token returned by Google OAuth")
                return RedirectResponse(url=f"{CLIENT_REDIRECT_URI}/new?auth_error=missing_access_token")

            # Fetch user profile information
            userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
            headers = {"Authorization": f"Bearer {access_token}"}
            userinfo_res = await client.get(userinfo_url, headers=headers)
            if userinfo_res.status_code != 200:
                logger.error(f"Failed to fetch Google user profile: {userinfo_res.text}")
                return RedirectResponse(url=f"{CLIENT_REDIRECT_URI}/new?auth_error=userinfo_failed")
            
            user_info = userinfo_res.json()
            email = user_info.get("email")
            name = user_info.get("name") or (email.split("@")[0] if email else "Google User")
            avatar_url = user_info.get("picture")

            if not email:
                logger.error("Google OAuth response is missing email address")
                return RedirectResponse(url=f"{CLIENT_REDIRECT_URI}/new?auth_error=missing_email")

            # Resolve user in database
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalars().first()

            if user:
                # Update details if changed or if they signed in from Google
                user.name = name
                user.avatar_url = avatar_url
                user.is_guest = False
            else:
                user = User(
                    email=email,
                    name=name,
                    avatar_url=avatar_url,
                    is_guest=False
                )
                db.add(user)
            
            await db.commit()
            await db.refresh(user)

            # Issue JWT token session
            jwt_token = create_access_token(user_id=user.id, is_guest=False)
            return RedirectResponse(url=f"{CLIENT_REDIRECT_URI}/new?token={jwt_token}")
            
    except Exception as e:
        logger.error(f"Exception during Google OAuth callback: {e}", exc_info=True)
        return RedirectResponse(url=f"{CLIENT_REDIRECT_URI}/new?auth_error=internal_error")


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Retrieves metadata of the currently logged in user session."""
    return current_user
