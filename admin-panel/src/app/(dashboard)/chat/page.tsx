"use client";

import { useCallback, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatMessages } from "@/components/chat/chat-messages";
import { useAuth } from "@/hooks/use-auth";
import { queryApi } from "@/lib/api-client";
import type { ChatMessage, QueryResponse } from "@/lib/types";

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  const handleSend = useCallback(
    async (query: string, department?: string) => {
      if (!user) {
        toast.error("Vui lòng đăng nhập để sử dụng chat.");
        return;
      }

      const userMessage: ChatMessage = {
        role: "user",
        content: query,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);

      try {
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

        if (conversationId) {
          payload.conversation_id = conversationId;
        }

        const res = await queryApi.send(payload);
        const data: QueryResponse = res.data;

        if (data.conversation_id) {
          setConversationId(data.conversation_id);
        }

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.answer,
          sources: data.sources,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
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
    [user, conversationId]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Trò chuyện</h1>
          <p className="text-xs text-muted-foreground">
            Hỏi đáp với hệ thống tri thức ViHAT
          </p>
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

      {/* Messages area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden">
          <ChatMessages messages={messages} loading={loading} />
        </div>
      </div>

      {/* Input area */}
      <ChatInput onSend={handleSend} loading={loading} />
    </div>
  );
}
