"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquarePlus, RefreshCw, Trash2, MessageSquare, Cpu, Cloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { useAuth } from "@/hooks/use-auth";
import { queryApi, chatApi, ragApi } from "@/lib/api-client";
import type { ChatMessage, QueryResponse, Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

type ChatMode = "dify" | "local-rag";

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("dify");

  // Load conversation list
  const loadConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      const res = await chatApi.listConversations();
      setConversations(res.data);
    } catch {
      // Silently fail - conversations might not be available
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Load messages for a conversation
  const loadMessages = useCallback(async (convId: string) => {
    try {
      const res = await chatApi.getMessages(convId);
      const msgs: ChatMessage[] = (res.data || []).map((m: any) => ({
        role: m.role,
        content: m.content,
        sources: m.sources,
        timestamp: new Date(m.timestamp),
      }));
      setMessages(msgs);
      setConversationId(convId);
    } catch {
      toast.error("Không thể tải tin nhắn");
    }
  }, []);

  // On mount, load conversations and select the most recent
  useEffect(() => {
    loadConversations().then(() => {});
  }, [loadConversations]);

  // After conversations load, select the most recent one if none selected
  useEffect(() => {
    if (conversations.length > 0 && !conversationId && !loading) {
      loadMessages(conversations[0].id);
    }
  }, [conversations, conversationId, loading, loadMessages]);

  const handleNewConversation = useCallback(async () => {
    try {
      const res = await chatApi.createConversation();
      const newConv = res.data;
      setConversationId(newConv.id);
      setMessages([]);
      // Reload conversation list
      await loadConversations();
    } catch {
      // Fallback: just reset locally
      setMessages([]);
      setConversationId(null);
    }
  }, [loadConversations]);

  const handleSelectConversation = useCallback(
    (convId: string) => {
      if (convId === conversationId) return;
      loadMessages(convId);
    },
    [conversationId, loadMessages]
  );

  const handleDeleteConversation = useCallback(
    async (convId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await chatApi.deleteConversation(convId);
        if (convId === conversationId) {
          setMessages([]);
          setConversationId(null);
        }
        await loadConversations();
      } catch {
        toast.error("Không thể xoá cuộc hội thoại");
      }
    },
    [conversationId, loadConversations]
  );

  const handleSend = useCallback(
    async (query: string, department?: string) => {
      if (!user) {
        toast.error("Vui lòng đăng nhập để sử dụng chat.");
        return;
      }

      // Ensure we have a conversation
      let activeConvId = conversationId;
      if (!activeConvId) {
        try {
          const res = await chatApi.createConversation();
          activeConvId = res.data.id;
          setConversationId(activeConvId);
        } catch {
          toast.error("Không thể tạo cuộc hội thoại");
          return;
        }
      }

      const userMessage: ChatMessage = {
        role: "user",
        content: query,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);

      // Save user message to backend
      try {
        await chatApi.saveMessage(activeConvId!, { role: "user", content: query });
      } catch {
        // Non-critical, continue
      }

      try {
        let answerText: string;
        let answerSources: any[] | undefined;

        if (chatMode === "local-rag") {
          // --- Local RAG mode ---
          const res = await ragApi.chat(query, department);
          const data = res.data as {
            answer: string;
            sources?: { title: string; score: number; drive_url?: string; knowledge_base?: string }[];
            kg_results?: { entity: string; type: string }[];
          };
          answerText = data.answer;
          // Map local RAG sources to the Source format used by chat-messages
          answerSources = data.sources?.map((s) => ({
            document: s.title,
            chunk: s.drive_url ? s.drive_url : (s.knowledge_base || ""),
            score: s.score,
            drive_url: s.drive_url,
            knowledge_base: s.knowledge_base,
          }));
        } else {
          // --- Dify mode ---
          const payload: {
            user_id: string;
            query: string;
            department?: string;
            conversation_id?: string;
            options?: { include_sources: boolean };
          } = {
            user_id: user.id,
            query,
            options: { include_sources: true },
          };

          if (department) {
            payload.department = department;
          }

          if (activeConvId) {
            payload.conversation_id = activeConvId;
          }

          const res = await queryApi.send(payload);
          const data: QueryResponse = res.data;

          if (data.conversation_id) {
            setConversationId(data.conversation_id);
          }

          answerText = data.answer;
          answerSources = data.sources;
        }

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: answerText,
          sources: answerSources,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Save assistant message to backend
        try {
          await chatApi.saveMessage(activeConvId!, {
            role: "assistant",
            content: answerText,
            sources: answerSources,
          });
          // Refresh conversation list to update title/count
          await loadConversations();
        } catch {
          // Non-critical
        }
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.detail || "Không thể kết nối đến hệ thống. Vui lòng thử lại.";

        toast.error("Lỗi", { description: errorMsg });

        const errorMessage: ChatMessage = {
          role: "assistant",
          content: `Xin lỗi, đã xảy ra lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại.\n\n_${errorMsg}_`,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setLoading(false);
      }
    },
    [user, conversationId, loadConversations, chatMode]
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hôm nay";
    if (diffDays === 1) return "Hôm qua";
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  };

  return (
    <div className="flex h-full">
      {/* Conversation sidebar */}
      <div className="flex w-[250px] shrink-0 flex-col border-r border-border/50 bg-muted/30">
        <div className="flex items-center justify-between border-b border-border/50 px-3 py-3">
          <span className="text-sm font-medium text-foreground">Lịch sử</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewConversation}
            className="h-7 w-7 p-0"
            title="Cuộc hội thoại mới"
          >
            <MessageSquarePlus className="size-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          {loadingConversations && conversations.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              Đang tải...
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              Chưa có cuộc hội thoại nào
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 p-1.5">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={cn(
                    "group relative flex w-full flex-col items-start gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent",
                    conv.id === conversationId && "bg-accent"
                  )}
                >
                  <div className="flex w-full items-center gap-2">
                    <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm">
                      {conv.title.length > 30
                        ? conv.title.slice(0, 30) + "..."
                        : conv.title}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handleDeleteConversation(conv.id, e as any);
                        }
                      }}
                      className="hidden shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:inline-flex"
                    >
                      <Trash2 className="size-3.5" />
                    </span>
                  </div>
                  <span className="pl-5.5 text-[11px] text-muted-foreground">
                    {formatDate(conv.created_at)}
                    {conv.message_count > 0 && ` \u00b7 ${conv.message_count} tin nhắn`}
                  </span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Trò chuyện</h1>
            <p className="text-xs text-muted-foreground">
              Hỏi đáp với hệ thống tri thức ViHAT
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Chat mode toggle */}
            <div className="flex items-center rounded-lg border border-border/60 bg-muted/30 p-0.5">
              <button
                onClick={() => setChatMode("dify")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  chatMode === "dify"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Cloud className="size-3.5" />
                Dify
              </button>
              <button
                onClick={() => setChatMode("local-rag")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  chatMode === "local-rag"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Cpu className="size-3.5" />
                Local RAG
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNewConversation}
              disabled={messages.length === 0}
            >
              <RefreshCw className="size-3.5" data-icon="inline-start" />
              Cuộc hội thoại mới
            </Button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden">
            <ChatMessages messages={messages} loading={loading} conversationId={conversationId} />
          </div>
        </div>

        {/* Input area */}
        <ChatInput onSend={handleSend} loading={loading} />
      </div>
    </div>
  );
}
