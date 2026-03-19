"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { feedbackApi } from "@/lib/api-client";
import type { Feedback, PaginatedResponse } from "@/lib/types";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const CATEGORY_CONFIG: Record<string, { label: string; variant: "destructive" | "secondary" | "outline"; className?: string }> = {
  wrong_answer: { label: "Sai", variant: "destructive" },
  no_answer: { label: "Chưa có", variant: "secondary", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200" },
  outdated: { label: "Hết hạn", variant: "secondary", className: "bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900 dark:text-orange-200" },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new: { label: "Mới tạo", className: "bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-200" },
  reviewing: { label: "Đang xem xét", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200" },
  resolved: { label: "Đã xử lý", className: "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200" },
};

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

export default function FeedbackPage() {
  const [data, setData] = useState<PaginatedResponse<Feedback> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);
  const limit = 20;

  const fetchData = () => {
    setLoading(true);
    const params: Record<string, unknown> = { page, limit };
    if (statusFilter !== "all") params.status = statusFilter;

    feedbackApi
      .list(params)
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  // When selecting a feedback item, pre-fill the edit form
  useEffect(() => {
    if (selectedFeedback) {
      setEditStatus(selectedFeedback.status);
      setAdminNote(selectedFeedback.admin_note || "");
    }
  }, [selectedFeedback]);

  const handleSaveStatus = async () => {
    if (!selectedFeedback) return;
    setSaving(true);
    try {
      await feedbackApi.updateStatus(selectedFeedback.id, {
        status: editStatus,
        admin_note: adminNote,
      });
      toast.success("Đã cập nhật trạng thái");
      setSelectedFeedback(null);
      fetchData();
    } catch {
      toast.error("Không thể cập nhật. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const items = data?.items ?? [];
  const totalPages = data?.pages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Góp ý nội dung</h1>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="new">Mới tạo</SelectItem>
              <SelectItem value="reviewing">Đang xem xét</SelectItem>
              <SelectItem value="resolved">Đã xử lý</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead className="min-w-[300px]">Câu hỏi</TableHead>
                <TableHead>Phân loại</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Không có góp ý nào
                  </TableCell>
                </TableRow>
              ) : (
                items.map((fb) => {
                  const catConfig = CATEGORY_CONFIG[fb.category] ?? { label: fb.category, variant: "outline" as const };
                  const statusCfg = STATUS_CONFIG[fb.status] ?? { label: fb.status, className: "" };
                  return (
                    <TableRow
                      key={fb.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedFeedback(fb)}
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(fb.created_at), "dd/MM/yyyy HH:mm", {
                          locale: vi,
                        })}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <span className="block truncate">
                          {truncate(fb.query_text, 80)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={catConfig.variant} className={catConfig.className}>
                          {catConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusCfg.className}>
                          {statusCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFeedback(fb);
                          }}
                        >
                          Chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {data && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Trang {data.page} / {totalPages} ({data.total} bản ghi)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="size-4" />
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Tiếp
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={selectedFeedback !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedFeedback(null);
        }}
      >
        {selectedFeedback && (
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chi tiết góp ý</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              {/* Meta info */}
              <div className="flex flex-wrap gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Thời gian: </span>
                  {format(
                    new Date(selectedFeedback.created_at),
                    "dd/MM/yyyy HH:mm:ss",
                    { locale: vi }
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Phân loại: </span>
                  <Badge
                    variant={(CATEGORY_CONFIG[selectedFeedback.category]?.variant ?? "outline") as any}
                    className={CATEGORY_CONFIG[selectedFeedback.category]?.className}
                  >
                    {CATEGORY_CONFIG[selectedFeedback.category]?.label ?? selectedFeedback.category}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Trạng thái: </span>
                  <Badge
                    variant="secondary"
                    className={STATUS_CONFIG[selectedFeedback.status]?.className}
                  >
                    {STATUS_CONFIG[selectedFeedback.status]?.label ?? selectedFeedback.status}
                  </Badge>
                </div>
              </div>

              {/* Question */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Câu hỏi</h3>
                <div className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">
                  {selectedFeedback.query_text}
                </div>
              </div>

              {/* Answer */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Câu trả lời</h3>
                <div className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {selectedFeedback.answer_text}
                </div>
              </div>

              {/* Sources */}
              {selectedFeedback.sources && selectedFeedback.sources.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Nguồn tham khảo</h3>
                  <div className="space-y-2">
                    {selectedFeedback.sources.map(
                      (source: any, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-lg border p-3 text-sm"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">
                              {source.document}
                            </span>
                            {source.score != null && (
                              <Badge variant="outline">
                                {(source.score * 100).toFixed(0)}%
                              </Badge>
                            )}
                          </div>
                          {source.chunk && (
                            <p className="text-muted-foreground text-xs line-clamp-3">
                              {source.chunk}
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* User comment */}
              {selectedFeedback.user_comment && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Ghi chú người dùng</h3>
                  <div className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">
                    {selectedFeedback.user_comment}
                  </div>
                </div>
              )}

              {/* Admin actions */}
              <div className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-medium">Cập nhật trạng thái</h3>
                <Select value={editStatus} onValueChange={(v) => { if (v) setEditStatus(v); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn trạng thái..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Mới tạo</SelectItem>
                    <SelectItem value="reviewing">Đang xem xét</SelectItem>
                    <SelectItem value="resolved">Đã xử lý</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Ghi chú của admin..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleSaveStatus} disabled={saving}>
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
