"use client";

interface PromptRatingProps {
  score: number; // 0-100
  breakdown?: {
    clarity: number;
    conciseness: number;
    specificity: number;
    efficiency: number;
  };
}

export function PromptRating({ score, breakdown }: PromptRatingProps) {
  const getRating = () => {
    if (score >= 85) return { label: "Excellent", color: "green", ring: "ring-green/30" };
    if (score >= 70) return { label: "Good", color: "navy", ring: "ring-navy/30" };
    if (score >= 50) return { label: "Average", color: "warning", ring: "ring-warning/30" };
    return { label: "Needs Work", color: "danger", ring: "ring-danger/30" };
  };

  const rating = getRating();
  const scoreColor = {
    green: "text-green",
    navy: "text-navy",
    warning: "text-warning",
    danger: "text-danger",
  }[rating.color];

  const scoreBg = {
    green: "bg-green-bg",
    navy: "bg-navy-bg",
    warning: "bg-warning/10",
    danger: "bg-danger/10",
  }[rating.color];

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <div className="flex items-center gap-4">
        {/* Score Circle */}
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40" cy="40" r="34"
              fill="none"
              stroke="#E2DDD7"
              strokeWidth="8"
            />
            <circle
              cx="40" cy="40" r="34"
              fill="none"
              stroke={score >= 85 ? "#16563B" : score >= 70 ? "#002F4B" : score >= 50 ? "#C97A10" : "#C43030"}
              strokeWidth="8"
              strokeDasharray={`${(score / 100) * 213.6} 213.6`}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-bold font-mono ${scoreColor}`}>{score}</span>
            <span className="text-[10px] font-medium opacity-60">/100</span>
          </div>
        </div>

        {/* Rating */}
        <div>
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${scoreBg} ${scoreColor}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {rating.label}
          </div>
          <p className="text-xs opacity-60 mt-1 max-w-xs">
            {score >= 85
              ? "Great prompt! Clear, specific, and efficient. Likely to produce excellent responses."
              : score >= 70
              ? "Good prompt with room for improvement. Consider being more specific about the desired format and constraints."
              : score >= 50
              ? "Average prompt. Adding more context, examples, or constraints could significantly improve results."
              : "This prompt could be much better. Try being more specific, adding examples, and clarifying the expected output format."}
          </p>
        </div>
      </div>

      {/* Breakdown bars */}
      {breakdown && (
        <div className="space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-60">Score Breakdown</p>
          {Object.entries(breakdown).map(([key, value]) => {
            const labels: Record<string, string> = {
              clarity: "Clarity",
              conciseness: "Conciseness",
              specificity: "Specificity",
              efficiency: "Token Efficiency",
            };
            const barColor =
              value >= 85 ? "bg-green" : value >= 70 ? "bg-navy" : value >= 50 ? "bg-warning" : "bg-danger";

            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-xs w-28 text-right opacity-70">{labels[key] || key}</span>
                <div className="flex-1 h-2 bg-black-border rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                    style={{ width: `${value}%` }}
                  />
                </div>
                <span className="text-xs font-mono w-8 text-right font-medium">{value}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
