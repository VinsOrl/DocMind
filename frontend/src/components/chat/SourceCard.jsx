import { useState } from "react";

function scoreColor(score) {
  if (score >= 0.85) return "#7ab87a"; // success green
  if (score >= 0.7) return "#c9a040"; // amber
  return "#c97070"; // muted red
}

export default function SourceCard({ source }) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round(source.similarity_score * 100);
  const color = scoreColor(source.similarity_score);

  return (
    <div className="rounded-lg border border-border bg-raised p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded border border-border px-1.5 py-0.5 text-xs text-text-muted">
          Page {source.page}
        </span>
        <span className="text-xs font-medium" style={{ color }}>
          {pct}%
        </span>
      </div>
      <p
        className={`cursor-pointer font-mono text-xs leading-relaxed text-text-muted ${
          expanded ? "" : "line-clamp-3"
        }`}
        onClick={() => setExpanded(!expanded)}
        title="Click to expand/collapse"
      >
        {source.text}
      </p>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-base">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
