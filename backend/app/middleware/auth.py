from fastapi import Request, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import os
from typing import Optional

security = HTTPBearer(auto_error=False)


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Optional[str]:
    """
    Extract user_id from Clerk JWT token.
    Falls back to a mock user for development if no Clerk key is set.
    """
    if not credentials:
        return None

    token = credentials.credentials
    secret_key = os.getenv("CLERK_SECRET_KEY", "")

    if not secret_key:
        # Development mode: decode without verification
        try:
            payload = jwt.decode(
                token,
                options={"verify_signature": False},
            )
            return payload.get("sub")
        except JWTError:
            return None

    try:
        payload = jwt.decode(
            token,
            secret_key,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload.get("sub")
    except JWTError:
        return None


async def require_user(
    user_id: Optional[str] = Depends(get_current_user_id),
) -> str:
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id
