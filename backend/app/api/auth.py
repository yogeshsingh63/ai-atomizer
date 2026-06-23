import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import User
from app.schemas import TokenResponse, UserResponse
from app.services.auth import create_access_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


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
