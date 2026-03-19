"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, MessageCircle, User } from "lucide-react";
import { SourceCard } from "@/components/chat/source-card";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChatMessagesProps {
  messages: ChatMessage[];
  loading: boolean;
}

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

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

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

        <span className="text-[10px] tabular-nums text-muted-foreground/60">
          {message.timestamp.toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}

export function ChatMessages({ messages, loading }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (messages.length === 0 && !loading) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
      {messages.map((message, idx) => (
        <MessageBubble key={idx} message={message} />
      ))}
      {loading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
