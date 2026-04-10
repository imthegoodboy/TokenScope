from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_, Integer
from datetime import datetime, date, timedelta
from typing import List, Optional
import secrets
import string

from ..database import Group, GroupMember, ExtensionLog, ExtensionStats, get_db

router = APIRouter()

def get_user_id(x_user_id: str = Header(default=None)) -> str:
    return x_user_id or "anonymous"

def generate_code(length: int = 8) -> str:
    """Generate a unique alphanumeric code"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))

# ============ SCHEMAS ============

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None

class GroupResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    code: str
    admin_id: str
    member_count: int = 0
    created_at: str

class GroupMemberResponse(BaseModel):
    id: int
    user_id: str
    role: str
    joined_at: str
    stats: Optional[dict] = None

class MemberStats(BaseModel):
    total_optimizations: int = 0
    total_accepts: int = 0
    total_rejects: int = 0
    total_tokens_saved: int = 0
    total_cost_saved: float = 0.0
    avg_attention_score: float = 0.0
    acceptance_rate: float = 0.0
    recent_logs: List[dict] = []

class JoinGroupRequest(BaseModel):
    code: str

# ============ GROUP ENDPOINTS ============

@router.post("/groups")
async def create_group(
    data: GroupCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """Create a new group"""
    # Generate unique code
    while True:
        code = generate_code(8)
        existing = await db.execute(select(Group).where(Group.code == code))
        if not existing.scalar_one_or_none():
            break

    group = Group(
        name=data.name,
        description=data.description,
        code=code,
        admin_id=user_id
    )
    db.add(group)
    await db.flush()

    # Add creator as admin member
    member = GroupMember(
        group_id=group.id,
        user_id=user_id,
        role="admin"
    )
    db.add(member)
    await db.commit()

    return {
        "success": True,
        "group": {
            "id": group.id,
            "name": group.name,
            "code": group.code,
            "description": group.description,
            "admin_id": group.admin_id,
            "created_at": group.created_at.isoformat()
        }
    }

@router.get("/groups")
async def get_my_groups(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """Get all groups user is a member of"""
    result = await db.execute(
        select(Group, GroupMember).join(
            GroupMember, Group.id == GroupMember.group_id
        ).where(
            GroupMember.user_id == user_id,
            GroupMember.is_active == True
        ).order_by(Group.created_at.desc())
    )

    groups = []
    for group, member in result.all():
        # Get member count
        count_result = await db.execute(
            select(func.count(GroupMember.id)).where(
                GroupMember.group_id == group.id,
                GroupMember.is_active == True
            )
        )
        member_count = count_result.scalar()

        groups.append({
            "id": group.id,
            "name": group.name,
            "code": group.code,
            "description": group.description,
            "admin_id": group.admin_id,
            "role": member.role,
            "member_count": member_count,
            "created_at": group.created_at.isoformat() if group.created_at else None
        })

    return groups

@router.get("/groups/{group_id}")
async def get_group(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """Get group details"""
    # Check membership
    member_check = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id,
            GroupMember.is_active == True
        )
    )
    member = member_check.scalar_one_or_none()

    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    group_result = await db.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Get member count
    count_result = await db.execute(
        select(func.count(GroupMember.id)).where(
            GroupMember.group_id == group_id,
            GroupMember.is_active == True
        )
    )
    member_count = count_result.scalar()

    return {
        "id": group.id,
        "name": group.name,
        "code": group.code,
        "description": group.description,
        "admin_id": group.admin_id,
        "role": member.role,
        "member_count": member_count,
        "created_at": group.created_at.isoformat() if group.created_at else None
    }

@router.delete("/groups/{group_id}")
async def delete_group(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """Delete a group (admin only)"""
    group_result = await db.execute(select(Group).where(Group.id == group_id))
    group = group_result.scalar_one_or_none()

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if group.admin_id != user_id:
        raise HTTPException(status_code=403, detail="Only admin can delete group")

    # Soft delete
    group.is_active = False
    await db.commit()

    return {"success": True, "message": "Group deleted"}

# ============ JOIN/LEAVE ============

@router.post("/groups/join")
async def join_group(
    data: JoinGroupRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """Join a group using code"""
    # Find group by code
    group_result = await db.execute(
        select(Group).where(
            Group.code == data.code.upper(),
            Group.is_active == True
        )
    )
    group = group_result.scalar_one_or_none()

    if not group:
        raise HTTPException(status_code=404, detail="Invalid group code")

    # Check if already a member
    existing = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group.id,
            GroupMember.user_id == user_id,
            GroupMember.is_active == True
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already a member of this group")

    # Add as member
    member = GroupMember(
        group_id=group.id,
        user_id=user_id,
        role="member"
    )
    db.add(member)
    await db.commit()

    return {
        "success": True,
        "message": "Joined group successfully",
        "group": {
            "id": group.id,
            "name": group.name,
            "code": group.code
        }
    }

@router.post("/groups/{group_id}/leave")
async def leave_group(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """Leave a group"""
    member_result = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id
        )
    )
    member = member_result.scalar_one_or_none()

    if not member:
        raise HTTPException(status_code=404, detail="Not a member of this group")

    if member.role == "admin":
        raise HTTPException(status_code=400, detail="Admin cannot leave. Delete the group instead.")

    member.is_active = False
    await db.commit()

    return {"success": True, "message": "Left group"}

# ============ MEMBERS ============

@router.get("/groups/{group_id}/members")
async def get_group_members(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """Get all members of a group"""
    # Check membership
    member_check = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id,
            GroupMember.is_active == True
        )
    )
    if not member_check.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this group")

    result = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.is_active == True
        ).order_by(GroupMember.joined_at.desc())
    )

    members = []
    for member in result.scalars().all():
        # Get stats for this member
        stats_result = await db.execute(
            select(
                func.count(ExtensionLog.id).label("total_optimizations"),
                func.sum(func.cast(ExtensionLog.tokens_saved, Integer)).label("total_tokens_saved"),
                func.sum(ExtensionLog.cost_saved).label("total_cost_saved"),
                func.avg(ExtensionLog.attention_score).label("avg_attention_score")
            ).where(ExtensionLog.user_id == member.user_id)
        )
        stats = stats_result.one()

        # Get accepts/rejects
        accepts_result = await db.execute(
            select(func.count(ExtensionLog.id)).where(
                ExtensionLog.user_id == member.user_id,
                ExtensionLog.accepted == True
            )
        )
        accepts = accepts_result.scalar() or 0

        total_result = await db.execute(
            select(func.count(ExtensionLog.id)).where(ExtensionLog.user_id == member.user_id)
        )
        total = total_result.scalar() or 0

        members.append({
            "id": member.id,
            "user_id": member.user_id,
            "role": member.role,
            "joined_at": member.joined_at.isoformat() if member.joined_at else None,
            "stats": {
                "total_optimizations": stats.total_optimizations or 0,
                "total_accepts": accepts,
                "total_rejects": total - accepts,
                "total_tokens_saved": stats.total_tokens_saved or 0,
                "total_cost_saved": stats.total_cost_saved or 0.0,
                "avg_attention_score": round(stats.avg_attention_score or 0.5, 2),
                "acceptance_rate": round((accepts / total * 100) if total > 0 else 0, 1)
            }
        })

    return members

@router.get("/groups/{group_id}/members/{member_user_id}/logs")
async def get_member_logs(
    group_id: int,
    member_user_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """Get extension logs for a specific member (admin only)"""
    # Check if requester is admin
    admin_check = await db.execute(
        select(Group).where(
            Group.id == group_id,
            Group.admin_id == user_id
        )
    )
    group = admin_check.scalar_one_or_none()

    if not group:
        raise HTTPException(status_code=403, detail="Only admin can view member logs")

    # Get logs
    result = await db.execute(
        select(ExtensionLog).where(
            ExtensionLog.user_id == member_user_id
        ).order_by(ExtensionLog.created_at.desc()).limit(limit)
    )

    logs = []
    for log in result.scalars().all():
        logs.append({
            "id": log.id,
            "original_prompt": log.original_prompt,
            "optimized_prompt": log.optimized_prompt,
            "original_tokens": log.original_tokens,
            "optimized_tokens": log.optimized_tokens,
            "tokens_saved": log.tokens_saved,
            "cost_saved": log.cost_saved,
            "attention_score": log.attention_score,
            "chatbot": log.chatbot,
            "accepted": log.accepted,
            "created_at": log.created_at.isoformat() if log.created_at else None
        })

    return logs

@router.get("/groups/{group_id}/stats")
async def get_group_stats(
    group_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    """Get aggregated stats for the entire group"""
    # Check membership
    member_check = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id,
            GroupMember.is_active == True
        )
    )
    if not member_check.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this group")

    # Get all member user IDs
    members_result = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.is_active == True
        )
    )
    members = members_result.scalars().all()
    member_ids = [m.user_id for m in members]

    if not member_ids:
        return {
            "total_members": 0,
            "total_optimizations": 0,
            "total_tokens_saved": 0,
            "total_cost_saved": 0,
            "avg_attention_score": 0,
            "avg_acceptance_rate": 0,
            "daily_stats": []
        }

    # Get aggregated stats
    stats_result = await db.execute(
        select(
            func.count(ExtensionLog.id).label("total_optimizations"),
            func.sum(func.cast(ExtensionLog.tokens_saved, Integer)).label("total_tokens_saved"),
            func.sum(ExtensionLog.cost_saved).label("total_cost_saved"),
            func.avg(ExtensionLog.attention_score).label("avg_attention_score")
        ).where(ExtensionLog.user_id.in_(member_ids))
    )
    stats = stats_result.one()

    # Get accepts for rate calculation
    accepts_result = await db.execute(
        select(func.count(ExtensionLog.id)).where(
            ExtensionLog.user_id.in_(member_ids),
            ExtensionLog.accepted == True
        )
    )
    accepts = accepts_result.scalar() or 0
    total = stats.total_optimizations or 0

    # Get daily stats for last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    daily_result = await db.execute(
        select(
            func.date(ExtensionLog.created_at).label("date"),
            func.count(ExtensionLog.id).label("optimizations"),
            func.sum(func.cast(ExtensionLog.tokens_saved, Integer)).label("tokens_saved")
        ).where(
            ExtensionLog.user_id.in_(member_ids),
            ExtensionLog.created_at >= thirty_days_ago
        ).group_by(
            func.date(ExtensionLog.created_at)
        ).order_by(
            func.date(ExtensionLog.created_at).desc()
        )
    )

    daily_stats = []
    for row in daily_result.all():
        daily_stats.append({
            "date": row.date.isoformat() if hasattr(row.date, 'isoformat') else str(row.date),
            "optimizations": row.optimizations or 0,
            "tokens_saved": row.tokens_saved or 0
        })

    return {
        "total_members": len(members),
        "total_optimizations": total,
        "total_tokens_saved": stats.total_tokens_saved or 0,
        "total_cost_saved": stats.total_cost_saved or 0.0,
        "avg_attention_score": round(stats.avg_attention_score or 0, 2),
        "avg_acceptance_rate": round((accepts / total * 100) if total > 0 else 0, 1),
        "daily_stats": daily_stats
    }