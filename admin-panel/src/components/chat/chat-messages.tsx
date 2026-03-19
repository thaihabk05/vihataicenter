"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Flag, MessageCircle, User } from "lucide-react";
import { toast } from "sonner";
import { SourceCard } from "@/components/chat/source-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { feedbackApi } from "@/lib/api-client";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChatMessagesProps {
  messages: ChatMessage[];
  loading: boolean;
  conversationId?: string | null;
}

const FEEDBACK_CATEGORIES = [
  { value: "wrong_answer", label: "Câu trả lời sai" },
  { value: "no_answer", label: "Chưa có câu trả lời" },
  { value: "outdated", label: "Thông tin cũ/hết hạn" },
] as const;

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Bot className="size-4 text-muted-foreground" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="size-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
          <span className="size-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
          <span className="size-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
        <MessageCircle className="size-8 text-primary" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold text-foreground">
          ViHAT Knowledge System
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Hãy đặt câu hỏi để bắt đầu cuộc trò chuyện với hệ thống tri thức...
        </p>
      </div>
    </div>
  );
}

function FeedbackDialog({
  open,
  onOpenChange,
  message,
  queryText,
  conversationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: ChatMessage;
  queryText: string;
  conversationId?: string | null;
}) {
  const [category, setCategory] = useState<string>("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!category) {
      toast.error("Vui lòng chọn phân loại góp ý");
      return;
    }
    setSubmitting(true);
    try {
      await feedbackApi.submit({
        query_text: queryText,
        answer_text: message.content,
        sources: message.sources ?? [],
        category,
        user_comment: comment,
        conversation_id: conversationId ?? undefined,
      });
      toast.success("Cảm ơn góp ý của bạn!");
      onOpenChange(false);
      setCategory("");
      setComment("");
    } catch {
      toast.error("Không thể gửi góp ý. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Góp ý về câu trả lời</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Phân loại</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn phân loại..." />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Ghi chú thêm</label>
            <Textarea
              placeholder="Mô tả chi tiết vấn đề..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !category}
            className="w-full"
          >
            {submitting ? "Đang gửi..." : "Gửi góp ý"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MessageBubble({
  message,
  queryText,
  conversationId,
}: {
  message: ChatMessage;
  queryText: string;
  conversationId?: string | null;
}) {
  const isUser = message.role === "user";
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary" : "bg-muted"
        )}
      >
        {isUser ? (
          <User className="size-4 text-primary-foreground" />
        ) : (
          <Bot className="size-4 text-muted-foreground" />
        )}
      </div>

      <div
        className={cn(
          "flex max-w-[75%] flex-col gap-2",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isUser
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm bg-muted text-foreground"
          )}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0 prose-headings:my-1 prose-headings:text-base prose-h1:text-base prose-h2:text-sm prose-h3:text-sm prose-pre:my-1 prose-table:my-1 prose-th:px-2 prose-th:py-1 prose-th:text-left prose-th:text-xs prose-th:bg-muted/50 prose-td:px-2 prose-td:py-1 prose-td:text-xs prose-td:border-t prose-hr:my-2 leading-snug">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children, ...props }) => {
                    const isDownload = href?.includes("/download") || href?.includes("/files/");
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={isDownload ? "inline-flex items-center gap-1 text-primary font-medium no-underline hover:underline" : undefined}
                        {...props}
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="flex w-full flex-col gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Nguồn tham khảo ({message.sources.length})
            </span>
            {message.sources.map((source, idx) => (
              <SourceCard key={idx} source={source} index={idx} />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-[10px] tabular-nums text-muted-foreground/60">
            {message.timestamp.toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {!isUser && (
            <button
              onClick={() => setFeedbackOpen(true)}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground"
              title="Góp ý về câu trả lời này"
            >
              <Flag className="size-3" />
              <span>Góp ý</span>
            </button>
          )}
        </div>
      </div>

      {!isUser && (
        <FeedbackDialog
          open={feedbackOpen}
          onOpenChange={setFeedbackOpen}
          message={message}
          queryText={queryText}
          conversationId={conversationId}
        />
      )}
    </div>
  );
}

export function ChatMessages({ messages, loading, conversationId }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (messages.length === 0 && !loading) {
    return <EmptyState />;
  }

  // Build a map: for each bot message index, find the preceding user message text
  const getQueryText = (idx: number): string => {
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i].content;
    }
    return "";
  };

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
      {messages.map((message, idx) => (
        <MessageBubble
          key={idx}
          message={message}
          queryText={getQueryText(idx)}
          conversationId={conversationId}
        />
      ))}
      {loading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
