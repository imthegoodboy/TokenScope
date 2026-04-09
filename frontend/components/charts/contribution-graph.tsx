"use client";

interface ContributionGraphProps {
  data?: Array<{ date: string; count: number }>;
  weeks?: number;
}

export function ContributionGraph({ data, weeks = 12 }: ContributionGraphProps) {
  // Generate demo data if not provided
  const graphData = data || generateDemoData(weeks);

  const maxCount = Math.max(...graphData.map((d) => d.count), 1);

  function getIntensityClass(count: number): string {
    if (count === 0) return "bg-black-border";
    const ratio = count / maxCount;
    if (ratio > 0.75) return "bg-jaffa";
    if (ratio > 0.5) return "bg-jaffa/75";
    if (ratio > 0.25) return "bg-jaffa/50";
    return "bg-jaffa/25";
  }

  function getIntensityLabel(count: number): string {
    if (count === 0) return "No requests";
    return `${count} request${count === 1 ? "" : "s"}`;
  }

  // Group by week
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="space-y-3">
      {/* Month labels */}
      <div className="flex ml-8 text-xs text-black-soft">
        {graphData.length > 0 && (() => {
          let lastMonth = -1;
          const labels: Array<{ month: string; weeks: number }> = [];
          for (let i = 0; i < weeks; i++) {
            const month = new Date(graphData[i * 7]?.date || Date.now()).getMonth();
            if (month !== lastMonth) {
              labels.push({ month: monthLabels[month], weeks: 1 });
              lastMonth = month;
            } else if (labels.length > 0) {
              labels[labels.length - 1].weeks++;
            }
          }
          return labels.map((l, i) => (
            <span
              key={i}
              className="text-xs text-black-soft"
              style={{ marginLeft: i === 0 ? 0 : `${(l.weeks - 1) * 14}px`, minWidth: `${l.weeks * 14}px` }}
            >
              {l.month}
            </span>
          ));
        })()}
      </div>

      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 justify-between text-xs text-black-soft pr-1">
          <span className="h-3" />
          <span className="h-3">Mon</span>
          <span className="h-3" />
          <span className="h-3">Wed</span>
          <span className="h-3" />
          <span className="h-3">Fri</span>
          <span className="h-3" />
        </div>

        {/* Grid */}
        {Array.from({ length: weeks }, (_, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-0.5">
            {Array.from({ length: 7 }, (_, dayIdx) => {
              const idx = weekIdx * 7 + dayIdx;
              const item = graphData[idx];
              if (!item) return <div key={dayIdx} className="w-3 h-3" />;
              const date = new Date(item.date);
              const dayOfWeek = date.getDay();
              if (dayOfWeek !== dayIdx) return <div key={dayIdx} className="w-3 h-3" />;

              return (
                <div
                  key={dayIdx}
                  className={`w-3 h-3 rounded-sm transition-all duration-150 cursor-pointer hover:ring-2 hover:ring-jaffa/50 ${getIntensityClass(item.count)}`}
                  title={`${item.date}: ${getIntensityLabel(item.count)}`}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 justify-end">
        <span className="text-xs text-black-soft">Less</span>
        {[
          "bg-black-border",
          "bg-jaffa/25",
          "bg-jaffa/50",
          "bg-jaffa/75",
          "bg-jaffa",
        ].map((cls, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
        ))}
        <span className="text-xs text-black-soft">More</span>
      </div>
    </div>
  );
}

function generateDemoData(weeks: number): Array<{ date: string; count: number }> {
  const data = [];
  const totalDays = weeks * 7;
  const end = new Date();

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const dayOfWeek = d.getDay();
    // Simulate more activity on weekdays
    const baseActivity = dayOfWeek === 0 || dayOfWeek === 6 ? 0.3 : 1;
    const count = Math.random() < 0.2 ? 0 : Math.floor(Math.random() * 40 * baseActivity + 1);
    data.push({
      date: d.toISOString().split("T")[0],
      count,
    });
  }
  return data;
}
