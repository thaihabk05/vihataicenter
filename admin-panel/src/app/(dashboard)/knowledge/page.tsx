"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, Trash2, FileText, Download, ExternalLink, Layers } from "lucide-react";
import { knowledgeApi } from "@/lib/api-client";
import { DEPARTMENTS, DOC_STATUS, KB_LIST } from "@/lib/constants";
import type { KnowledgeDocument } from "@/lib/types";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
  processing:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  ready:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  deleted:
    "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function KnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadKb, setUploadKb] = useState<string>(KB_LIST[0]);
  const [uploadTags, setUploadTags] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const fetchDocs = () => {
    setLoading(true);
    knowledgeApi
      .list()
      .then((res) => setDocs(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const filteredDocs =
    activeTab === "all"
      ? docs
      : docs.filter((d) => d.knowledge_base === activeTab);

  const resetUploadForm = () => {
    setUploadTitle("");
    setUploadKb(KB_LIST[0]);
    setUploadTags("");
    setUploadFile(null);
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle);
      formData.append("knowledge_base", uploadKb);
      if (uploadTags.trim()) {
        formData.append(
          "tags",
          JSON.stringify(
            uploadTags.split(",").map((t) => t.trim()).filter(Boolean)
          )
        );
      }
      await knowledgeApi.upload(formData);
      setUploadOpen(false);
      resetUploadForm();
      fetchDocs();
    } catch (err: any) {
      console.error(err);
      const detail = err?.response?.data?.detail || err?.message || "Upload thất bại";
      toast.error(`Lỗi upload: ${detail}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await knowledgeApi.delete(id);
      fetchDocs();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^.]+$/, ""));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^.]+$/, ""));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Quản lý tri thức</h1>
        <Button onClick={() => setUploadOpen(true)}>
          <Upload className="size-4" />
          Tải lên tài liệu
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v ?? "all")}>
        <TabsList>
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          {KB_LIST.map((kb) => (
            <TabsTrigger key={kb} value={kb}>
              {DEPARTMENTS[kb as keyof typeof DEPARTMENTS] ?? kb}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tài liệu</TableHead>
                    <TableHead>KB</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Kích thước</TableHead>
                    <TableHead>Sections</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Chưa có tài liệu nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDocs.map((doc: any) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium max-w-[280px]">
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="truncate text-sm">{doc.title}</p>
                              <p className="truncate text-xs text-muted-foreground">{doc.file_name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {DEPARTMENTS[
                              doc.knowledge_base as keyof typeof DEPARTMENTS
                            ] ?? doc.knowledge_base}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline">{doc.file_type ?? "-"}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatFileSize(doc.file_size_bytes)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Layers className="size-3 text-muted-foreground" />
                            <span className="text-xs">{doc.sections_count ?? doc.chunks_count ?? 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              STATUS_COLORS[doc.status] ??
                              STATUS_COLORS.processing
                            }
                          >
                            {DOC_STATUS[
                              doc.status as keyof typeof DOC_STATUS
                            ] ?? doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {doc.created_at ? format(new Date(doc.created_at), "dd/MM/yyyy", { locale: vi }) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {doc.drive_url && (
                              <a href={doc.drive_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon-sm" title="Mở trên Google Drive">
                                  <ExternalLink className="size-4 text-blue-500" />
                                </Button>
                              </a>
                            )}
                            {doc.download_url && (
                              <a href={doc.download_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon-sm" title="Tải xuống">
                                  <Download className="size-4" />
                                </Button>
                              </a>
                            )}
                            {deleteConfirmId === doc.id ? (
                              <>
                                <Button
                                  variant="destructive"
                                  size="xs"
                                  onClick={() => handleDelete(doc.id)}
                                >
                                  Xác nhận
                                </Button>
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={() => setDeleteConfirmId(null)}
                                >
                                  Hủy
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setDeleteConfirmId(doc.id)}
                                title="Xoá tài liệu"
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) resetUploadForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tải lên tài liệu</DialogTitle>
            <DialogDescription>
              Chọn file và điền thông tin để tải lên Knowledge Base
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx"
              />
              <Upload className="size-8 mx-auto text-muted-foreground mb-2" />
              {uploadFile ? (
                <p className="text-sm font-medium">{uploadFile.name}</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Kéo thả file vào đây hoặc nhấn để chọn
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, DOCX, TXT, MD, CSV, XLSX
                  </p>
                </>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="upload-title">Tiêu đề</Label>
              <Input
                id="upload-title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Tiêu đề tài liệu"
              />
            </div>

            <div className="grid gap-2">
              <Label>Knowledge Base</Label>
              <Select value={uploadKb} onValueChange={(v) => setUploadKb(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KB_LIST.map((kb) => (
                    <SelectItem key={kb} value={kb}>
                      {DEPARTMENTS[kb as keyof typeof DEPARTMENTS] ?? kb}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="upload-tags">Tags (phân cách bằng dấu phẩy)</Label>
              <Input
                id="upload-tags"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadOpen(false);
                resetUploadForm();
              }}
              disabled={uploading}
            >
              Hủy
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !uploadFile || !uploadTitle}
            >
              {uploading ? "Đang tải lên..." : "Tải lên"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
