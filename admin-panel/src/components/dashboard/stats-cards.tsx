"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Clock, Target, Coins } from "lucide-react";
import type { Stats } from "@/lib/types";

interface StatsCardsProps {
  stats: Stats;
}

const cards = [
  {
    key: "total_queries" as const,
    label: "Tổng truy vấn",
    icon: MessageSquare,
    format: (stats: Stats) => stats.total_queries.toLocaleString("vi-VN"),
  },
  {
    key: "avg_response_time_ms" as const,
    label: "Thời gian phản hồi TB",
    icon: Clock,
    format: (stats: Stats) =>
      `${(stats.avg_response_time_ms / 1000).toFixed(1)}s`,
  },
  {
    key: "avg_confidence_score" as const,
    label: "Độ chính xác TB",
    icon: Target,
    format: (stats: Stats) =>
      `${(stats.avg_confidence_score * 100).toFixed(1)}%`,
  },
  {
    key: "tokens_used" as const,
    label: "Token sử dụng",
    icon: Coins,
    format: (stats: Stats) =>
      stats.tokens_used.total.toLocaleString("vi-VN"),
  },
] as const;

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.format(stats)}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
