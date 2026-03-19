"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Source } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SourceCardProps {
  source: Source;
  index: number;
}

export function SourceCard({ source, index }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const scorePercent = Math.round(source.score * 100);

  return (
    <button
      type="button"
      onClick={() => setExpanded(!expanded)}
      className={cn(
        "w-full rounded-lg border border-border/60 bg-muted/30 text-left transition-colors hover:bg-muted/60",
        expanded && "bg-muted/50"
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <FileText className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-xs font-medium text-foreground">
          {source.document}
        </span>
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px] font-semibold tabular-nums",
            scorePercent >= 90
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : scorePercent >= 70
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          )}
        >
          {scorePercent}%
        </Badge>
        {expanded ? (
          <ChevronUp className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        )}
      </div>
      {expanded && (
        <div className="border-t border-border/40 px-3 py-2">
          <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {source.chunk}
          </p>
        </div>
      )}
    </button>
  );
}
