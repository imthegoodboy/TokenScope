from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from ..database import PromptOptimization, UserScore
from datetime import datetime, timedelta
import json

class ScoringEngine:
    """Calculate user attention scores based on prompt optimization data."""

    # Scoring weights
    WEIGHTS = {
        'token_efficiency': 0.25,  # How much tokens were saved
        'prompt_quality': 0.30,    # How good was the original prompt
        'improvement_ratio': 0.25, # Ratio of improvements
        'consistency': 0.10,       # Consistent performance
        'streak': 0.10,            # Active usage streak
    }

    # Tier thresholds
    TIERS = {
        'master': (90, 100),
        'expert': (75, 89),
        'advanced': (60, 74),
        'intermediate': (40, 59),
        'beginner': (0, 39),
    }

    # Common prompt mistakes to detect
    MISTAKE_PATTERNS = {
        'verbose': ['please', 'kindly', 'could you', 'would you', 'i would like'],
        'repetitive': None,  # Check via repetition detection
        'unclear': ['maybe', 'perhaps', 'i think', 'not sure'],
        'vague': ['etc', 'and so on', 'things like that', 'whatever'],
        'lengthy': None,  # Check via length
        'ambiguous_pronouns': ['it', 'this', 'that', 'they', 'them'],
        'missing_context': None,  # Check via prompt content
        'poor_structure': None,  # Check via formatting
    }

    # Improvement patterns
    IMPROVEMENT_PATTERNS = {
        'concise': 'Made more concise',
        'structured': 'Added structure/formatting',
        'clear_instructions': 'Clear instructions added',
        'specific': 'Made more specific',
        'actionable': 'Made more actionable',
        'context_added': 'Context improved',
        'examples_added': 'Examples added',
        'role_added': 'Role/persona added',
        'format_specified': 'Output format specified',
        'constraints_added': 'Constraints clarified',
    }

    def calculate_prompt_quality(self, prompt: str) -> float:
        """Calculate quality score (0-100) for an original prompt."""
        score = 50  # Start with base score

        # Length factors
        word_count = len(prompt.split())
        if word_count < 5:
            score -= 15  # Too short
        elif word_count < 15:
            score -= 5   # Slightly short
        elif word_count > 200:
            score -= 10  # Too long
        elif word_count > 100:
            score -= 5   # Slightly long

        # Check for verbose patterns
        prompt_lower = prompt.lower()
        verbose_count = sum(1 for pattern in self.MISTAKE_PATTERNS['verbose']
                          if pattern in prompt_lower)
        score -= verbose_count * 3

        # Check for unclear patterns
        unclear_count = sum(1 for pattern in self.MISTAKE_PATTERNS['unclear']
                          if pattern in prompt_lower)
        score -= unclear_count * 5

        # Check for vague patterns
        vague_count = sum(1 for pattern in self.MISTAKE_PATTERNS['vague']
                         if pattern in prompt_lower)
        score -= vague_count * 4

        # Check for question marks (indicates clarity needs)
        if '?' in prompt and not any(q in prompt_lower for q in ['what', 'how', 'why', 'when', 'where', 'who']):
            score -= 5

        # Positive indicators
        if 'example' in prompt_lower or 'e.g.' in prompt_lower:
            score += 10
        if 'specifically' in prompt_lower or 'exactly' in prompt_lower:
            score += 8
        if any(char in prompt for char in ['1.', '2.', '3.', '- ', '* ', '•']):
            score += 10  # Has structure
        if ':' in prompt:  # Has labels/roles
            score += 5

        # Clamp score between 0 and 100
        return max(0, min(100, score))

    def calculate_complexity(self, original: str, optimized: str) -> float:
        """Calculate complexity score based on prompt structure."""
        score = 50

        original_words = original.split()
        optimized_words = optimized.split()

        # Length difference
        if len(original_words) > len(optimized_words):
            reduction = ((len(original_words) - len(optimized_words)) / len(original_words)) * 100
            score += min(reduction * 0.5, 20)

        # Structure indicators in original
        if any(char in original for char in ['\n', '\t', ':']):
            score += 10  # Has some structure

        # Special characters (formulas, code, etc.)
        special_chars = sum(1 for c in original if c in '{}[]()<>=+-*/')
        if special_chars > 5:
            score += 15

        # Word variety (repetition check)
        words = [w.lower() for w in original_words if len(w) > 3]
        if words:
            unique_ratio = len(set(words)) / len(words)
            if unique_ratio < 0.5:
                score -= 15  # Too repetitive
            elif unique_ratio > 0.7:
                score += 10  # Good variety

        return max(0, min(100, score))

    def calculate_efficiency_score(self, original_tokens: int, optimized_tokens: int,
                                   tokens_saved: int) -> float:
        """Calculate efficiency score based on token savings."""
        if original_tokens == 0:
            return 50

        efficiency_ratio = tokens_saved / original_tokens

        # Calculate score based on savings percentage
        if efficiency_ratio >= 0.5:
            score = 90 + min(efficiency_ratio * 20, 10)  # 90-100
        elif efficiency_ratio >= 0.3:
            score = 70 + (efficiency_ratio - 0.3) * 100  # 70-90
        elif efficiency_ratio >= 0.15:
            score = 50 + (efficiency_ratio - 0.15) * 133  # 50-70
        elif efficiency_ratio >= 0:
            score = 30 + efficiency_ratio * 133  # 30-50
        else:
            score = max(30 - abs(efficiency_ratio) * 100, 0)  # Negative or no savings

        return max(0, min(100, score))

    def detect_mistakes(self, original: str) -> list:
        """Detect common mistakes in original prompt."""
        mistakes = []
        original_lower = original.lower()

        # Check each mistake pattern
        for mistake_type, patterns in self.MISTAKE_PATTERNS.items():
            if patterns:
                for pattern in patterns:
                    if pattern in original_lower:
                        mistakes.append({
                            'type': mistake_type,
                            'pattern': pattern,
                            'severity': 'medium' if mistake_type in ['verbose', 'unclear', 'vague'] else 'low'
                        })
                        break  # Only count each type once

        # Check for excessive length
        word_count = len(original.split())
        if word_count > 150:
            mistakes.append({
                'type': 'excessively_lengthy',
                'description': f'Prompt has {word_count} words - consider condensing',
                'severity': 'high'
            })
        elif word_count > 80:
            mistakes.append({
                'type': 'lengthy',
                'description': f'Prompt has {word_count} words - could be more concise',
                'severity': 'low'
            })

        # Check for repetition
        words = original.split()
        if words:
            for word in set(words):
                count = words.count(word)
                if count > 5 and len(word) > 3:
                    mistakes.append({
                        'type': 'repetitive',
                        'description': f'Word "{word}" repeated {count} times',
                        'severity': 'medium'
                    })
                    break

        return mistakes[:5]  # Return top 5 mistakes

    def detect_improvements(self, original: str, optimized: str) -> list:
        """Detect what improvements were made during optimization."""
        improvements = []
        original_lower = original.lower()
        optimized_lower = optimized.lower()

        # Check for structure added
        has_structure_original = any(char in original for char in ['\n', '1.', '2.', '- ', '•'])
        has_structure_optimized = any(char in optimized for char in ['\n', '1.', '2.', '- ', '•'])
        if not has_structure_original and has_structure_optimized:
            improvements.append({
                'type': 'structured',
                'description': 'Added clear structure and formatting'
            })

        # Check for examples added
        if 'example' in optimized_lower and 'example' not in original_lower:
            improvements.append({
                'type': 'examples_added',
                'description': 'Added examples for clarity'
            })

        # Check for role/persona added
        role_indicators = ['you are', 'as a', 'role:', 'act as', 'imagine you']
        has_role_original = any(ind in original_lower for ind in role_indicators)
        has_role_optimized = any(ind in optimized_lower for ind in role_indicators)
        if not has_role_original and has_role_optimized:
            improvements.append({
                'type': 'role_added',
                'description': 'Added role or persona context'
            })

        # Check for output format specified
        format_indicators = ['format:', 'output:', 'return:', 'json', 'list', 'table']
        has_format_original = any(ind in original_lower for ind in format_indicators)
        has_format_optimized = any(ind in optimized_lower for ind in format_indicators)
        if not has_format_original and has_format_optimized:
            improvements.append({
                'type': 'format_specified',
                'description': 'Specified output format'
            })

        # Check for action verbs
        action_verbs = ['create', 'write', 'analyze', 'explain', 'generate', 'provide']
        actions_original = sum(1 for v in action_verbs if v in original_lower)
        actions_optimized = sum(1 for v in action_verbs if v in optimized_lower)
        if actions_optimized > actions_original:
            improvements.append({
                'type': 'actionable',
                'description': 'Made instructions more actionable'
            })

        # Check for constraints added
        constraint_words = ['must', 'should', 'only', 'exactly', 'specifically']
        constraints_original = sum(1 for w in constraint_words if w in original_lower)
        constraints_optimized = sum(1 for w in constraint_words if w in optimized_lower)
        if constraints_optimized > constraints_original:
            improvements.append({
                'type': 'constraints_added',
                'description': 'Added clear constraints'
            })

        # Check for conciseness
        original_words = len(original.split())
        optimized_words = len(optimized.split())
        if optimized_words < original_words * 0.9:
            improvements.append({
                'type': 'concise',
                'description': f'Condensed from {original_words} to {optimized_words} words'
            })

        return improvements[:5]  # Return top 5 improvements

    def calculate_attention_score(self, quality: float, efficiency: float,
                                  complexity: float) -> float:
        """Calculate final attention score (0-100) from component scores."""
        weighted_score = (
            quality * self.WEIGHTS['prompt_quality'] +
            efficiency * self.WEIGHTS['token_efficiency'] +
            complexity * self.WEIGHTS['complexity_score'] +
            efficiency * self.WEIGHTS['improvement_ratio']  # Reuse efficiency for improvement ratio
        )

        # Normalize to 0-100
        return max(0, min(100, weighted_score))

    def get_tier(self, score: float) -> str:
        """Get tier name based on score."""
        for tier, (min_score, max_score) in self.TIERS.items():
            if min_score <= score <= max_score:
                return tier
        return 'beginner'

    async def process_optimization(self, db: AsyncSession, optimization_id: int):
        """Process an optimization and calculate all scores."""
        result = await db.execute(
            select(PromptOptimization).where(PromptOptimization.id == optimization_id)
        )
        optimization = result.scalar_one_or_none()

        if not optimization:
            return None

        # Calculate scores
        quality = self.calculate_prompt_quality(optimization.original_prompt)
        complexity = self.calculate_complexity(optimization.original_prompt, optimization.optimized_prompt)
        efficiency = self.calculate_efficiency_score(
            optimization.original_tokens,
            optimization.optimized_tokens,
            optimization.tokens_saved
        )
        attention = self.calculate_attention_score(quality, efficiency, complexity)

        # Detect mistakes and improvements
        mistakes = self.detect_mistakes(optimization.original_prompt)
        improvements = self.detect_improvements(optimization.original_prompt, optimization.optimized_prompt)

        # Update optimization record
        optimization.prompt_quality_score = quality
        optimization.complexity_score = complexity
        optimization.efficiency_score = efficiency
        optimization.attention_score = attention
        optimization.mistakes_made = json.dumps(mistakes) if mistakes else None
        optimization.improvements_made = json.dumps(improvements) if improvements else None

        await db.commit()

        # Update user score
        await self.update_user_score(db, optimization.user_id)

        return {
            'attention_score': attention,
            'quality_score': quality,
            'efficiency_score': efficiency,
            'complexity_score': complexity,
            'mistakes': mistakes,
            'improvements': improvements
        }

    async def update_user_score(self, db: AsyncSession, user_id: str):
        """Update user's overall attention score."""
        # Get all optimizations for this user
        result = await db.execute(
            select(PromptOptimization).where(PromptOptimization.user_id == user_id)
        )
        optimizations = result.scalars().all()

        if not optimizations:
            return

        # Calculate aggregates
        total_prompts = len(optimizations)
        total_tokens_saved = sum(opt.tokens_saved or 0 for opt in optimizations)
        total_cost_saved = sum(opt.cost_saved or 0 for opt in optimizations)

        # Average scores
        avg_quality = sum(opt.prompt_quality_score or 0 for opt in optimizations) / total_prompts
        avg_efficiency = sum(opt.efficiency_score or 0 for opt in optimizations) / total_prompts
        avg_complexity = sum(opt.complexity_score or 0 for opt in optimizations) / total_prompts
        avg_attention = sum(opt.attention_score or 0 for opt in optimizations) / total_prompts

        # Best and worst scores
        scores = [opt.attention_score or 0 for opt in optimizations]
        best_score = max(scores) if scores else 0
        worst_score = min(scores) if scores else 0

        # Calculate trend (last 10 vs previous 10)
        recent_scores = scores[:10]
        older_scores = scores[10:20] if len(scores) > 10 else scores[:10]
        if older_scores:
            trend = (sum(recent_scores) / len(recent_scores)) - (sum(older_scores) / len(older_scores))
        else:
            trend = 0

        # Calculate streak
        today = datetime.utcnow().date()
        streak = 0
        dates = sorted(set(opt.created_at.date() for opt in optimizations), reverse=True)
        for i, date in enumerate(dates):
            expected_date = today - timedelta(days=i)
            if date == expected_date:
                streak += 1
            else:
                break

        # Get or create user score
        score_result = await db.execute(
            select(UserScore).where(UserScore.user_id == user_id)
        )
        user_score = score_result.scalar_one_or_none()

        if not user_score:
            user_score = UserScore(user_id=user_id)
            db.add(user_score)

        # Update values
        user_score.total_prompts = total_prompts
        user_score.total_optimizations = total_prompts
        user_score.total_tokens_saved = total_tokens_saved
        user_score.total_cost_saved = total_cost_saved
        user_score.average_quality_score = avg_quality
        user_score.average_efficiency_score = avg_efficiency
        user_score.attention_score = avg_attention
        user_score.best_score = best_score
        user_score.worst_score = worst_score
        user_score.improvement_trend = trend
        user_score.streak_days = streak
        user_score.longest_streak = max(streak, user_score.longest_streak)
        user_score.tier = self.get_tier(avg_attention)
        user_score.last_active = datetime.utcnow()
        user_score.updated_at = datetime.utcnow()

        await db.commit()

        # Update rank (simple based on score, could be enhanced with global ranking)
        rank_result = await db.execute(
            select(func.count(UserScore.id) + 1).where(UserScore.attention_score > avg_attention)
        )
        user_score.rank = rank_result.scalar() or 1
        await db.commit()

        return user_score


scoring_engine = ScoringEngine()