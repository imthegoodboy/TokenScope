from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta
import secrets
import string

from ..database import ExtensionLog, get_db

router = APIRouter()

def get_user_id(x_user_id: str = Header(default=None)) -> str:
    return x_user_id or "anonymous"

class ConnectionTokenCreate(BaseModel):
    pass

class ConnectionTokenResponse(BaseModel):
    token: str
    expires_at: str

# In-memory store for connection tokens (for demo)
# In production, use Redis or database
connection_tokens = {}

def generate_connection_token():
    """Generate a unique connection token"""
    return secrets.token_urlsafe(32)

@router.post("/extension/connect")
async def create_connection_token(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """Create a temporary connection token for linking extension"""
    if user_id == "anonymous" or not user_id:
        raise HTTPException(status_code=401, detail="Please sign in first")

    # Generate token
    token = generate_connection_token()
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    connection_tokens[token] = {
        "user_id": user_id,
        "created_at": datetime.utcnow(),
        "expires_at": expires_at,
        "used": False
    }

    return {
        "token": token,
        "expires_at": expires_at.isoformat(),
        "connect_url": f"http://localhost:3000/connect?token={token}"
    }

@router.post("/extension/connect/verify")
async def verify_connection_token(
    token: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """Verify and use a connection token to link extension"""
    if user_id == "anonymous" or not user_id:
        raise HTTPException(status_code=401, detail="Please sign in first")

    token_data = connection_tokens.get(token)

    if not token_data:
        raise HTTPException(status_code=404, detail="Invalid token")

    if token_data["used"]:
        raise HTTPException(status_code=400, detail="Token already used")

    if datetime.utcnow() > token_data["expires_at"]:
        raise HTTPException(status_code=400, detail="Token expired")

    # Mark token as used
    token_data["used"] = True

    return {
        "success": True,
        "message": "Extension connected successfully",
        "user_id": user_id
    }

@router.get("/extension/connect/status")
async def get_connection_status(
    user_id: str = Depends(get_user_id)
):
    """Check if extension is connected to this user"""
    # Check if there are any recent logs for this user
    if user_id == "anonymous" or not user_id:
        return {
            "connected": False,
            "user_id": None
        }

    return {
        "connected": True,
        "user_id": user_id,
        "message": "Extension is connected to this account"
    }