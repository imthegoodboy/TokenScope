"use client";

import type { TokenScore } from "@/lib/api";

interface TokenHighlighterProps {
  tokens: TokenScore[];
  prompt: string;
}

export function TokenHighlighter({ tokens, prompt }: TokenHighlighterProps) {
  const words = prompt.split(/(\s+)/);

  return (
    <div className="p-4 bg-bg rounded-lg border border-black-border font-mono text-sm leading-relaxed code-scroll overflow-x-auto">
      {words.map((word, i) => {
        if (word.trim() === "") {
          return <span key={i}>{word}</span>;
        }
        const cleanWord = word.toLowerCase().replace(/[.,!?;:'"()[\]{}]/g, "");
        const tokenData = tokens.find(
          (t) =>
            t.token.toLowerCase() === cleanWord ||
            cleanWord.includes(t.token.toLowerCase())
        );
        const importance = tokenData?.importance || "low";
        const score = tokenData?.score ?? 0;

        const cls =
          importance === "very_high"
            ? "token-very-high"
            : importance === "high"
            ? "token-high"
            : importance === "medium"
            ? "token-medium"
            : "token-low";

        return (
          <span
            key={i}
            className={cls}
            title={`${importance.toUpperCase()} importance (score: ${score.toFixed(4)})`}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}
