from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import os
from typing import Optional

security = HTTPBearer(auto_error=False)


async def verify_clerk_token(token: str) -> Optional[dict]:
    """Verify a Clerk JWT token and return the payload."""
    secret_key = os.getenv("CLERK_SECRET_KEY", "")

    if not secret_key:
        # Development mode: decode without signature verification
        try:
            payload = jwt.decode(
                token,
                "",
                options={"verify_signature": False},
            )
            return payload
        except JWTError:
            return None

    # Production mode: Clerk issues tokens with the secret key
    # that can be verified using HS256
    try:
        payload = jwt.decode(
            token,
            secret_key,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload
    except JWTError:
        return None


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Optional[str]:
    """Extract user_id from Clerk JWT token."""
    if not credentials:
        return None

    token = credentials.credentials
    payload = await verify_clerk_token(token)
    if payload:
        return payload.get("sub")
    return None


async def require_user(
    user_id: Optional[str] = Depends(get_current_user_id),
) -> str:
    """Require a valid user ID, raises 401 if not authenticated."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id
