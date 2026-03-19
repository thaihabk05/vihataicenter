"use client";

import { useCallback, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEPARTMENTS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (query: string, department?: string) => void;
  loading: boolean;
}

export function ChatInput({ onSend, loading }: ChatInputProps) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    onSend(trimmed, department || undefined);
    setQuery("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [query, department, loading, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    // Auto-resize textarea
    const el = e.target;
    el.style.height = "auto";
    const lineHeight = 24;
    const maxLines = 4;
    const maxHeight = lineHeight * maxLines;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  };

  return (
    <div className="border-t border-border/50 bg-background px-4 pb-4 pt-3">
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        {/* Department selector */}
        <div className="flex items-center gap-2">
          <Select value={department} onValueChange={(v) => setDepartment(v ?? "")}>
            <SelectTrigger size="sm" className="w-auto text-xs">
              <SelectValue placeholder="Phòng ban (tùy chọn)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">
                Tất cả phòng ban
              </SelectItem>
              {Object.entries(DEPARTMENTS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Input area */}
        <div className="flex items-end gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Nhập câu hỏi của bạn..."
            disabled={loading}
            rows={1}
            className={cn(
              "flex-1 resize-none bg-transparent text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            )}
          />
          <Button
            size="icon-sm"
            onClick={handleSend}
            disabled={!query.trim() || loading}
            className="shrink-0"
          >
            <Send className="size-4" />
          </Button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/60">
          Nhấn Enter để gửi, Shift+Enter để xuống dòng
        </p>
      </div>
    </div>
  );
}
