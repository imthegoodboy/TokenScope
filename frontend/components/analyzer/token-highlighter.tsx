"use client";

import type { TokenScore } from "@/lib/api";

interface TokenHighlighterProps {
  tokens: TokenScore[];
  prompt: string;
}

export function TokenHighlighter({ tokens, prompt }: TokenHighlighterProps) {
  const words = prompt.split(/(\s+)/);

  return (
    <div className="p-4 bg-cream rounded-lg border border-black-border font-mono text-sm leading-relaxed">
      {words.map((word, i) => {
        if (word.trim() === "") {
          return <span key={i}>{word}</span>;
        }
        const tokenData = tokens.find(
          (t) => t.token.toLowerCase() === word.toLowerCase() || word.toLowerCase().includes(t.token.toLowerCase())
        );
        const importance = tokenData?.importance || "low";
        const score = tokenData?.score || 0;

        return (
          <span
            key={i}
            className={
              importance === "high"
                ? "token-high"
                : importance === "medium"
                ? "token-med"
                : "token-low"
            }
            title={`Importance: ${importance} (score: ${score.toFixed(4)})`}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}
