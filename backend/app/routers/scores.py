from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from pydantic import BaseModel
from datetime import datetime, timedelta
from ..database import get_db, PromptOptimization, UserScore, ProxyKey, UserRole
from ..services.scoring_engine import scoring_engine
import json

router = APIRouter()

# ============ USER SCORE ENDPOINTS ============

class UserScoreResponse(BaseModel):
    user_id: str
    total_prompts: int
    total_optimizations: int
    total_tokens_saved: int
    total_cost_saved: float
    average_quality_score: float
    average_efficiency_score: float
    attention_score: float
    rank: int
    tier: str
    best_score: float
    worst_score: float
    improvement_trend: float
    streak_days: int
    longest_streak: int

@router.get("/scores/{user_id}", response_model=UserScoreResponse)
async def get_user_score(user_id: str, db: AsyncSession = Depends(get_db)):
    """Get user's attention score and ranking."""
    result = await db.execute(select(UserScore).where(UserScore.user_id == user_id))
    user_score = result.scalar_one_or_none()

    if not user_score:
        # Return default score
        return UserScoreResponse(
            user_id=user_id,
            total_prompts=0,
            total_optimizations=0,
            total_tokens_saved=0,
            total_cost_saved=0.0,
            average_quality_score=0.0,
            average_efficiency_score=0.0,
            attention_score=50.0,  # Default score
            rank=0,
            tier="beginner",
            best_score=0.0,
            worst_score=0.0,
            improvement_trend=0.0,
            streak_days=0,
            longest_streak=0
        )

    return UserScoreResponse(
        user_id=user_score.user_id,
        total_prompts=user_score.total_prompts,
        total_optimizations=user_score.total_optimizations,
        total_tokens_saved=user_score.total_tokens_saved,
        total_cost_saved=user_score.total_cost_saved,
        average_quality_score=user_score.average_quality_score,
        average_efficiency_score=user_score.average_efficiency_score,
        attention_score=user_score.attention_score,
        rank=user_score.rank,
        tier=user_score.tier,
        best_score=user_score.best_score,
        worst_score=user_score.worst_score,
        improvement_trend=user_score.improvement_trend,
        streak_days=user_score.streak_days,
        longest_streak=user_score.longest_streak
    )

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    attention_score: float
    total_prompts: int
    total_tokens_saved: int
    tier: str

@router.get("/scores/leaderboard", response_model=list[LeaderboardEntry])
async def get_leaderboard(limit: int = 20, db: AsyncSession = Depends(get_db)):
    """Get top users leaderboard."""
    result = await db.execute(
        select(UserScore).where(UserScore.total_prompts > 0)
        .order_by(desc(UserScore.attention_score))
        .limit(limit)
    )
    scores = result.scalars().all()

    return [
        LeaderboardEntry(
            rank=i + 1,
            user_id=score.user_id,
            attention_score=score.attention_score,
            total_prompts=score.total_prompts,
            total_tokens_saved=score.total_tokens_saved,
            tier=score.tier
        )
        for i, score in enumerate(scores)
    ]

# ============ PROMPT ANALYSIS ENDPOINTS ============

class AnalysisResult(BaseModel):
    attention_score: float
    quality_score: float
    efficiency_score: float
    complexity_score: float
    mistakes: list
    improvements: list
    token_savings: int
    cost_savings: float

@router.post("/analyze-detailed")
async def analyze_prompt_detailed(
    user_id: str,
    original_prompt: str,
    optimized_prompt: str,
    original_tokens: int,
    optimized_tokens: int,
    tokens_saved: int,
    cost_saved: float,
    db: AsyncSession = Depends(get_db)
):
    """Analyze a prompt and return detailed scoring."""
    quality = scoring_engine.calculate_prompt_quality(original_prompt)
    complexity = scoring_engine.calculate_complexity(original_prompt, optimized_prompt)
    efficiency = scoring_engine.calculate_efficiency_score(original_tokens, optimized_tokens, tokens_saved)
    attention = scoring_engine.calculate_attention_score(quality, efficiency, complexity)
    mistakes = scoring_engine.detect_mistakes(original_prompt)
    improvements = scoring_engine.detect_improvements(original_prompt, optimized_prompt)

    return AnalysisResult(
        attention_score=attention,
        quality_score=quality,
        efficiency_score=efficiency,
        complexity_score=complexity,
        mistakes=mistakes,
        improvements=improvements,
        token_savings=tokens_saved,
        cost_savings=cost_savings
    )

# ============ PROCESS OPTIMIZATION WITH SCORING ============

class SaveOptimizationWithScore(BaseModel):
    user_id: str
    original_prompt: str
    optimized_prompt: str
    original_tokens: int
    optimized_tokens: int
    tokens_saved: int
    cost_saved: float
    target_model: str = "chatgpt"
    source: str = "extension"

@router.post("/save-with-score")
async def save_optimization_with_score(
    request: SaveOptimizationWithScore,
    db: AsyncSession = Depends(get_db)
):
    """Save optimization and calculate scores."""
    # Create optimization record
    optimization = PromptOptimization(
        user_id=request.user_id,
        original_prompt=request.original_prompt,
        optimized_prompt=request.optimized_prompt,
        original_tokens=request.original_tokens,
        optimized_tokens=request.optimized_tokens,
        tokens_saved=request.tokens_saved,
        cost_saved=request.cost_saved,
        target_model=request.target_model,
        source=request.source,
        accepted=True
    )
    db.add(optimization)
    await db.commit()
    await db.refresh(optimization)

    # Calculate and update scores
    scores = await scoring_engine.process_optimization(db, optimization.id)

    return {
        "success": True,
        "optimization_id": optimization.id,
        "scores": scores
    }

# ============ USER STATS WITH GRAPHS DATA ============

class GraphDataPoint(BaseModel):
    date: str
    tokens_saved: int
    prompts: int
    avg_score: float

@router.get("/stats/graph/{user_id}", response_model=list[GraphDataPoint])
async def get_graph_data(user_id: str, days: int = 30, db: AsyncSession = Depends(get_db)):
    """Get graph data for user's optimization history."""
    start_date = datetime.utcnow() - timedelta(days=days)

    result = await db.execute(
        select(PromptOptimization).where(
            PromptOptimization.user_id == user_id,
            PromptOptimization.created_at >= start_date
        ).order_by(PromptOptimization.created_at)
    )
    optimizations = result.scalars().all()

    # Group by date
    daily_data = {}
    for opt in optimizations:
        date_key = opt.created_at.strftime('%Y-%m-%d')
        if date_key not in daily_data:
            daily_data[date_key] = {
                'tokens_saved': 0,
                'prompts': 0,
                'scores': []
            }
        daily_data[date_key]['tokens_saved'] += opt.tokens_saved or 0
        daily_data[date_key]['prompts'] += 1
        daily_data[date_key]['scores'].append(opt.attention_score or 0)

    # Calculate averages
    graph_data = []
    for date in sorted(daily_data.keys()):
        data = daily_data[date]
        avg_score = sum(data['scores']) / len(data['scores']) if data['scores'] else 0
        graph_data.append(GraphDataPoint(
            date=date,
            tokens_saved=data['tokens_saved'],
            prompts=data['prompts'],
            avg_score=round(avg_score, 1)
        ))

    return graph_data

class MistakesSummary(BaseModel):
    type: str
    count: int
    severity: str

@router.get("/stats/mistakes/{user_id}", response_model=list[MistakesSummary])
async def get_mistakes_summary(user_id: str, db: AsyncSession = Depends(get_db)):
    """Get summary of all mistakes made by user."""
    result = await db.execute(
        select(PromptOptimization).where(PromptOptimization.user_id == user_id)
    )
    optimizations = result.scalars().all()

    mistake_counts = {}
    for opt in optimizations:
        if opt.mistakes_made:
            try:
                mistakes = json.loads(opt.mistakes_made)
                for mistake in mistakes:
                    mistake_type = mistake.get('type', 'unknown')
                    severity = mistake.get('severity', 'medium')
                    key = f"{mistake_type}_{severity}"
                    if key not in mistake_counts:
                        mistake_counts[key] = {'type': mistake_type, 'count': 0, 'severity': severity}
                    mistake_counts[key]['count'] += 1
            except:
                pass

    # Sort by count
    sorted_mistakes = sorted(mistake_counts.values(), key=lambda x: x['count'], reverse=True)
    return [MistakesSummary(**m) for m in sorted_mistakes[:10]]

class ImprovementsSummary(BaseModel):
    type: str
    count: int

@router.get("/stats/improvements/{user_id}", response_model=list[ImprovementsSummary])
async def get_improvements_summary(user_id: str, db: AsyncSession = Depends(get_db)):
    """Get summary of all improvements made."""
    result = await db.execute(
        select(PromptOptimization).where(PromptOptimization.user_id == user_id)
    )
    optimizations = result.scalars().all()

    improvement_counts = {}
    for opt in optimizations:
        if opt.improvements_made:
            try:
                improvements = json.loads(opt.improvements_made)
                for imp in improvements:
                    imp_type = imp.get('type', 'unknown')
                    if imp_type not in improvement_counts:
                        improvement_counts[imp_type] = 0
                    improvement_counts[imp_type] += 1
            except:
                pass

    sorted_improvements = sorted(improvement_counts.items(), key=lambda x: x[1], reverse=True)
    return [ImprovementsSummary(type=t, count=c) for t, c in sorted_improvements[:10]]

# ============ USER ROLE ENDPOINTS ============

class UserRole(BaseModel):
    user_id: str
    role: str  # 'developer' or 'user'
    created_at: datetime

# Store roles in a simple table
class UserRoleTable(Base):
    __tablename__ = "user_roles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), nullable=False, unique=True, index=True)
    role = Column(String(50), nullable=False)  # developer, user
    created_at = Column(DateTime, default=datetime.utcnow)

@router.post("/set-role")
async def set_user_role(user_id: str, role: str, db: AsyncSession = Depends(get_db)):
    """Set user's role (developer or user)."""
    if role not in ['developer', 'user']:
        raise HTTPException(status_code=400, detail="Role must be 'developer' or 'user'")

    from sqlalchemy import insert
    from ..database import Base

    # Check if table exists, if not create it
    # For now, we'll just upsert
    result = await db.execute(select(UserRoleTable).where(UserRoleTable.user_id == user_id))
    existing = result.scalar_one_or_none()

    if existing:
        existing.role = role
    else:
        new_role = UserRoleTable(user_id=user_id, role=role)
        db.add(new_role)

    await db.commit()
    return {"success": True, "role": role}

@router.get("/get-role")
async def get_user_role(user_id: str, db: AsyncSession = Depends(get_db)):
    """Get user's role."""
    result = await db.execute(select(UserRole).where(UserRole.user_id == user_id))
    role_record = result.scalar_one_or_none()

    if not role_record:
        return {"role": None, "user_id": user_id}

    return {"role": role_record.role, "user_id": user_id}