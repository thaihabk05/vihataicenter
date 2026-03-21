"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Upload,
  Trash2,
  FileText,
  Download,
  ExternalLink,
  Layers,
  FolderSync,
  Link2,
  Loader2,
  CheckCircle2,
  XCircle,
  FolderOpen,
  Sheet,
  Pencil,
  Database,
  User,
} from "lucide-react";
import { knowledgeApi, productApi, solutionApi } from "@/lib/api-client";
import { DEPARTMENTS, DOC_STATUS, KB_LIST } from "@/lib/constants";
import type { KnowledgeDocument, Product, DriveSource } from "@/lib/types";
import { Package, X, RefreshCw, Search, Sparkles, Globe } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const STATUS_COLORS: Record<string, string> = {
  processing:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  indexing:
    "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
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

/* ─── Source type helpers ─── */
function SourceIcon({ type }: { type?: string }) {
  switch (type) {
    case "google_drive":
      return <FolderOpen className="size-3.5 text-amber-600" />;
    case "google_sheet":
      return <Sheet className="size-3.5 text-green-600" />;
    case "google_doc":
      return <FileText className="size-3.5 text-blue-600" />;
    default:
      return <Upload className="size-3.5 text-gray-500" />;
  }
}

function sourceLabel(type?: string): string {
  switch (type) {
    case "google_drive": return "Google Drive";
    case "google_sheet": return "Google Sheet";
    case "google_doc": return "Google Doc";
    default: return "Upload";
  }
}

/* ─── Product Tag Selector (reusable) ─── */
interface SolutionItem {
  id: string;
  name: string;
  slug: string;
  product_id: string;
  product_name?: string;
  aliases?: string[];
}

function ProductTagSelector({
  products,
  solutions,
  selected,
  onChange,
}: {
  products: Product[];
  solutions: SolutionItem[];
  selected: string[];
  onChange: (tags: string[]) => void;
}) {
  const toggle = (slug: string) => {
    onChange(
      selected.includes(slug)
        ? selected.filter((s) => s !== slug)
        : [...selected, slug]
    );
  };

  return (
    <div className="grid gap-2">
      <Label className="flex items-center gap-1.5">
        <Package className="size-3.5" />
        Sản phẩm / Giải pháp liên quan
      </Label>
      {products.length > 0 ? (
        <div className="space-y-2">
          {/* Global knowledge tag */}
          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground">Chung</span>
            <div className="flex flex-wrap gap-1.5 ml-2">
              <Badge
                variant={selected.includes("chung") ? "default" : "outline"}
                className={`cursor-pointer transition-colors ${
                  selected.includes("chung") ? "bg-emerald-600 hover:bg-emerald-700" : "hover:bg-muted border-emerald-300"
                }`}
                onClick={() => toggle("chung")}
              >
                Kiến thức chung
                {selected.includes("chung") && <X className="size-3 ml-1" />}
              </Badge>
            </div>
          </div>
          {products.map((p) => {
            const productSolutions = solutions.filter((s) => s.product_id === p.id);
            return (
              <div key={p.id} className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">{p.name}</span>
                <div className="flex flex-wrap gap-1.5 ml-2">
                  {productSolutions.length > 0 ? (
                    productSolutions.map((s) => {
                      const isSelected = selected.includes(s.slug);
                      return (
                        <Badge
                          key={s.slug}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? "bg-blue-600 hover:bg-blue-700" : "hover:bg-muted"
                          }`}
                          onClick={() => toggle(s.slug)}
                        >
                          {s.name}
                          {isSelected && <X className="size-3 ml-1" />}
                        </Badge>
                      );
                    })
                  ) : (
                    <Badge
                      variant={selected.includes(p.slug) ? "default" : "outline"}
                      className={`cursor-pointer transition-colors ${
                        selected.includes(p.slug) ? "bg-blue-600 hover:bg-blue-700" : "hover:bg-muted"
                      }`}
                      onClick={() => toggle(p.slug)}
                    >
                      {p.name}
                      {selected.includes(p.slug) && <X className="size-3 ml-1" />}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          Chưa có sản phẩm nào. Vui lòng tạo sản phẩm trong trang Proposals &gt; Cài đặt.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Chọn giải pháp để AI tham khảo tài liệu này khi tạo proposal
      </p>
    </div>
  );
}

/* ─── Import Task type ─── */
interface ImportTask {
  task_id: string;
  type: "folder" | "sheet" | "doc";
  status: "importing" | "completed" | "error";
  status_detail?: string;
  url: string;
  title?: string;
  knowledge_base: string;
  source_id?: string;
  files_found?: number;
  files_processed?: number;
  synced?: number;
  skipped?: number;
  errors?: number;
  sections_count?: number;
  error?: string;
  details?: { file: string; status: string; reason?: string; sections?: number }[];
  started_at: string;
  completed_at?: string | null;
}

/* ─── Drive Import Dialog ─── */

type ImportMode = "folder" | "link" | "web";

function DriveImportDialog({
  open,
  onOpenChange,
  onStarted,
  products,
  solutions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onStarted: () => void;
  products: Product[];
  solutions: SolutionItem[];
}) {
  const [mode, setMode] = useState<ImportMode>("folder");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [kb, setKb] = useState<string>(KB_LIST[0]);
  const [productTags, setProductTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setUrl("");
    setName("");
    setDescription("");
    setTitle("");
    setKb(KB_LIST[0]);
    setProductTags([]);
  };

  const handleImport = async () => {
    if (!url.trim()) {
      toast.error("Vui lòng nhập URL");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "folder") {
        await knowledgeApi.importDrive({
          folder_url: url.trim(),
          knowledge_base: kb,
          name: name.trim() || undefined,
          description: description.trim() || undefined,
          product_tags: productTags.length > 0 ? productTags : undefined,
        });
      } else if (mode === "web") {
        await knowledgeApi.importWeb({
          url: url.trim(),
          knowledge_base: kb,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          product_tags: productTags.length > 0 ? productTags : undefined,
        });
      } else {
        await knowledgeApi.importLink({
          url: url.trim(),
          knowledge_base: kb,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          product_tags: productTags.length > 0 ? productTags : undefined,
        });
      }
      toast.success("Đã bắt đầu import! Quá trình sẽ chạy nền.");
      onOpenChange(false);
      reset();
      onStarted();
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail || err?.message || "Import thất bại";
      toast.error(detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderSync className="size-5 text-primary" />
            Import tri thức
          </DialogTitle>
          <DialogDescription>
            Thêm tài liệu từ Google Drive, Google Sheet/Doc, hoặc trang web
          </DialogDescription>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex gap-2 rounded-lg border p-1">
          <button
            onClick={() => setMode("folder")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mode === "folder"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <FolderOpen className="size-4" />
            Drive
          </button>
          <button
            onClick={() => setMode("link")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mode === "link"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Link2 className="size-4" />
            Sheet / Doc
          </button>
          <button
            onClick={() => setMode("web")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mode === "web"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Globe className="size-4" />
            Web URL
          </button>
        </div>

        <div className="grid gap-4 py-2">
          {/* URL Input */}
          <div className="grid gap-2">
            <Label>
              {mode === "folder"
                ? "URL thư mục Google Drive"
                : mode === "web"
                ? "URL trang web"
                : "URL Google Sheet / Doc"}
            </Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                mode === "folder"
                  ? "https://drive.google.com/drive/folders/..."
                  : mode === "web"
                  ? "https://example.com/product-info"
                  : "https://docs.google.com/spreadsheets/d/..."
              }
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              {mode === "folder"
                ? "Hệ thống sẽ quét toàn bộ file trong thư mục (Sheets, Docs, PDF, DOCX, XLSX...)"
                : "Hỗ trợ Google Sheet và Google Doc"}
            </p>
          </div>

          {/* Name (folder mode) / Title (link mode) */}
          <div className="grid gap-2">
            <Label>{mode === "folder" ? "Tên nguồn" : "Tiêu đề (tùy chọn)"}</Label>
            <Input
              value={mode === "folder" ? name : title}
              onChange={(e) =>
                mode === "folder"
                  ? setName(e.target.value)
                  : setTitle(e.target.value)
              }
              placeholder={
                mode === "folder"
                  ? "VD: Tài liệu kinh doanh eSMS"
                  : "Tên tài liệu"
              }
              disabled={submitting}
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label>Mô tả (tùy chọn)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả ngắn về nội dung..."
              rows={2}
              disabled={submitting}
            />
          </div>

          {/* KB Selector */}
          <div className="grid gap-2">
            <Label>Knowledge Base</Label>
            <Select value={kb} onValueChange={(v) => setKb(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KB_LIST.map((k) => (
                  <SelectItem key={k} value={k}>
                    {DEPARTMENTS[k as keyof typeof DEPARTMENTS] ?? k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product Tags */}
          <ProductTagSelector
            products={products}
            solutions={solutions}
            selected={productTags}
            onChange={setProductTags}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              reset();
            }}
            disabled={submitting}
          >
            Hủy
          </Button>
          <Button
            onClick={handleImport}
            disabled={submitting || !url.trim()}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <FolderSync className="size-4" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Edit Document Dialog ─── */

function EditDocumentDialog({
  doc,
  products,
  solutions,
  onClose,
  onSaved,
}: {
  doc: KnowledgeDocument | null;
  products: Product[];
  solutions: SolutionItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [productTags, setProductTags] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    if (doc) {
      setTitle(doc.title || "");
      setDescription(doc.description || "");
      const knownSlugs = new Set([
        ...products.map((p) => p.slug),
        ...solutions.map((s) => s.slug),
      ]);
      const docTags = doc.tags ?? [];
      setProductTags(docTags.filter((t) => knownSlugs.has(t)));
      setCustomTags(docTags.filter((t) => !knownSlugs.has(t)).join(", "));
    }
  }, [doc, products, solutions]);

  const handleAutoSummary = async () => {
    if (!doc) return;
    setSummarizing(true);
    try {
      const res = await knowledgeApi.autoSummary(doc.id);
      const summary = res.data?.summary;
      if (summary) {
        setDescription(summary);
        toast.success("Tạo mô tả tự động thành công");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Lỗi tạo mô tả tự động");
    } finally {
      setSummarizing(false);
    }
  };

  const handleSave = async () => {
    if (!doc) return;
    setSaving(true);
    try {
      const allTags = [
        ...new Set([
          ...productTags,
          ...customTags.split(",").map((t) => t.trim()).filter(Boolean),
        ]),
      ];
      await knowledgeApi.edit(doc.id, {
        title: title.trim(),
        description: description.trim(),
        tags: allTags,
      });
      toast.success("Cập nhật thành công");
      onClose();
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Lỗi cập nhật");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!doc} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-4" />
            Chỉnh sửa tài liệu
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Tiêu đề</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Mô tả</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                onClick={handleAutoSummary}
                disabled={summarizing}
              >
                {summarizing ? (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    Đang quét...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3" />
                    Tự động tóm tắt
                  </>
                )}
              </Button>
            </div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả tài liệu... Nhấn 'Tự động tóm tắt' để AI quét và tạo mô tả."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Khi lưu, mô tả sẽ được đưa vào Dify để bổ sung tri thức cho hệ thống.
            </p>
          </div>
          <ProductTagSelector
            products={products}
            solutions={solutions}
            selected={productTags}
            onChange={setProductTags}
          />
          <div className="grid gap-2">
            <Label>Tags tùy chỉnh (phân cách bằng dấu phẩy)</Label>
            <Input
              value={customTags}
              onChange={(e) => setCustomTags(e.target.value)}
              placeholder="tag1, tag2"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving || summarizing}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={saving || summarizing || !title.trim()}>
            {saving ? "Đang lưu..." : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Re-index by URL Dialog ─── */

interface SearchMatch {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  knowledge_base: string;
  drive_url: string;
  source_type: string;
  tags: string[];
  sections_count: number;
  created_at: string;
}

function ReindexByUrlDialog({
  open,
  onOpenChange,
  onStarted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onStarted: () => void;
}) {
  const [url, setUrl] = useState("");
  const [searching, setSearching] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setUrl("");
    setMatches([]);
    setSearched(false);
    setError("");
    setSearching(false);
    setReindexing(false);
  };

  const handleSearch = async () => {
    if (!url.trim()) return;
    setSearching(true);
    setError("");
    setMatches([]);
    setSearched(false);
    try {
      const res = await knowledgeApi.searchByUrl(url.trim());
      setMatches(res.data.matches ?? []);
      setSearched(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Lỗi tìm kiếm");
    } finally {
      setSearching(false);
    }
  };

  const handleReindex = async () => {
    if (!url.trim()) return;
    setReindexing(true);
    setError("");
    try {
      const res = await knowledgeApi.reindexByUrl(url.trim());
      toast.success(res.data.message || "Re-index thành công");
      onOpenChange(false);
      reset();
      onStarted();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Lỗi re-index");
    } finally {
      setReindexing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="size-4" />
            Re-index theo URL
          </DialogTitle>
          <DialogDescription>
            Nhập URL Google Sheet/Doc để tìm và re-index tài liệu trong hệ thống
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>URL Google Sheet / Doc</Label>
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button
                onClick={handleSearch}
                disabled={searching || !url.trim()}
                variant="secondary"
                className="shrink-0"
              >
                {searching ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          {searched && matches.length === 0 && (
            <div className="rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
              Không tìm thấy tài liệu nào trong hệ thống với URL này.
            </div>
          )}

          {matches.length > 0 && (
            <div className="rounded-lg border">
              <div className="px-3 py-2 border-b bg-muted/50">
                <p className="text-sm font-medium">
                  Tìm thấy {matches.length} tài liệu
                </p>
              </div>
              {matches.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 border-b last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{m.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">
                        {m.file_type}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {DEPARTMENTS[m.knowledge_base as keyof typeof DEPARTMENTS] ?? m.knowledge_base}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {m.sections_count} sections
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              reset();
            }}
            disabled={reindexing}
          >
            Hủy
          </Button>
          {matches.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleReindex}
              disabled={reindexing}
            >
              {reindexing ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1" />
                  Đang re-index...
                </>
              ) : (
                <>
                  <RefreshCw className="size-4 mr-1" />
                  Xóa & Re-index
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Import Tasks Panel ─── */

function ImportTasksPanel({ tasks }: { tasks: ImportTask[] }) {
  if (tasks.length === 0) return null;

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <FolderSync className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Lịch sử Import</h3>
        <Badge variant="secondary" className="text-xs">
          {tasks.length}
        </Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead>Nguồn</TableHead>
            <TableHead>Kho tri thức</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Chi tiết</TableHead>
            <TableHead>Thời gian</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const isRunning = task.status === "importing";
            const isError = task.status === "error";
            const isCompleted = task.status === "completed";

            const typeIcon =
              task.type === "folder" ? (
                <FolderOpen className="size-4 text-amber-600" />
              ) : task.type === "sheet" ? (
                <Sheet className="size-4 text-green-600" />
              ) : (
                <FileText className="size-4 text-blue-600" />
              );

            const kbLabel =
              DEPARTMENTS[task.knowledge_base as keyof typeof DEPARTMENTS] ??
              task.knowledge_base;

            return (
              <TableRow key={task.task_id}>
                <TableCell className="w-[40px]">
                  {isRunning ? (
                    <Loader2 className="size-4 animate-spin text-blue-600" />
                  ) : isError ? (
                    <XCircle className="size-4 text-red-500" />
                  ) : (
                    <CheckCircle2 className="size-4 text-green-500" />
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-0">
                    {typeIcon}
                    <div className="min-w-0">
                      <p className="text-sm truncate max-w-[250px]">
                        {task.title || task.url}
                      </p>
                      {task.type === "folder" && (
                        <p className="text-xs text-muted-foreground">
                          Thư mục Drive
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{kbLabel}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={
                      isRunning
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : isError
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    }
                  >
                    {isRunning
                      ? "Đang import"
                      : isError
                      ? "Lỗi"
                      : "Hoàn tất"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {isRunning && (
                    <span>
                      {task.status_detail || "Đang xử lý..."}
                      {task.files_found
                        ? ` (${task.files_processed ?? 0}/${task.files_found} file)`
                        : ""}
                    </span>
                  )}
                  {isCompleted && task.type === "folder" && (
                    <span>
                      {task.synced ?? 0} synced
                      {(task.skipped ?? 0) > 0 && `, ${task.skipped} bỏ qua`}
                      {(task.errors ?? 0) > 0 && (
                        <span className="text-red-500">
                          , {task.errors} lỗi
                        </span>
                      )}
                    </span>
                  )}
                  {isCompleted && task.type !== "folder" && (
                    <span>{task.sections_count ?? 0} sections</span>
                  )}
                  {isError && (
                    <span className="text-red-500 line-clamp-1">
                      {task.error}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {task.started_at
                    ? format(new Date(task.started_at), "dd/MM HH:mm", {
                        locale: vi,
                      })
                    : "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/* ─── Sources Panel ─── */

function SourcesPanel({
  sources,
  products,
  onDelete,
  onRefresh,
}: {
  sources: DriveSource[];
  products: Product[];
  onDelete: (id: string) => void;
  onRefresh: () => void;
}) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (sources.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        <Database className="size-8 mx-auto mb-2 opacity-50" />
        <p>Chưa có nguồn dữ liệu nào</p>
        <p className="text-xs mt-1">Import thư mục Drive hoặc link để bắt đầu</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên nguồn</TableHead>
            <TableHead>Loại</TableHead>
            <TableHead>Mô tả</TableHead>
            <TableHead>Kho</TableHead>
            <TableHead>Sản phẩm</TableHead>
            <TableHead>Tài liệu</TableHead>
            <TableHead>Người tạo</TableHead>
            <TableHead>Ngày</TableHead>
            <TableHead className="text-right">Hành động</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map((src) => {
            const typeIcon =
              src.type === "folder" ? (
                <FolderOpen className="size-4 text-amber-600" />
              ) : src.type === "sheet" ? (
                <Sheet className="size-4 text-green-600" />
              ) : (
                <FileText className="size-4 text-blue-600" />
              );
            const typeLabel =
              src.type === "folder"
                ? "Thư mục"
                : src.type === "sheet"
                ? "Sheet"
                : "Doc";
            const kbLabel =
              DEPARTMENTS[src.knowledge_base as keyof typeof DEPARTMENTS] ??
              src.knowledge_base;

            return (
              <TableRow key={src.id}>
                <TableCell className="font-medium max-w-[200px]">
                  <div className="flex items-center gap-2">
                    {typeIcon}
                    <div className="min-w-0">
                      <p className="truncate text-sm">{src.name}</p>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline truncate block"
                      >
                        Mở trên Drive
                      </a>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {typeLabel}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[150px]">
                  <p className="truncate">{src.description || "—"}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{kbLabel}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(src.product_tags ?? []).map((t) => (
                      <Badge
                        key={t}
                        variant="outline"
                        className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      >
                        {products.find((p) => p.slug === t)?.name ?? t}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {src.document_count}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {src.uploaded_by_name || "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {src.created_at
                    ? format(new Date(src.created_at), "dd/MM/yyyy", {
                        locale: vi,
                      })
                    : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <a href={src.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon-sm" title="Mở trên Drive">
                        <ExternalLink className="size-4 text-blue-500" />
                      </Button>
                    </a>
                    {deleteConfirmId === src.id ? (
                      <>
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={() => {
                            onDelete(src.id);
                            setDeleteConfirmId(null);
                          }}
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
                        onClick={() => setDeleteConfirmId(src.id)}
                        title="Xóa nguồn và tất cả tài liệu"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <div className="border-t px-4 py-2">
        <p className="text-xs text-muted-foreground">
          Xóa nguồn sẽ xóa tất cả tài liệu liên quan khỏi hệ thống. Không ảnh hưởng đến Google Drive gốc.
        </p>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */

export default function KnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [driveImportOpen, setDriveImportOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // View mode: "documents" or "sources"
  const [viewMode, setViewMode] = useState<"documents" | "sources">("documents");

  // Import tasks
  const [importTasks, setImportTasks] = useState<ImportTask[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Products for tag filter
  const [products, setProducts] = useState<Product[]>([]);
  const [solutions, setSolutions] = useState<SolutionItem[]>([]);
  const [productFilter, setProductFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sources
  const [sources, setSources] = useState<DriveSource[]>([]);

  // Edit dialog
  const [editDoc, setEditDoc] = useState<KnowledgeDocument | null>(null);

  // Re-index dialog
  const [reindexOpen, setReindexOpen] = useState(false);

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadKb, setUploadKb] = useState<string>(KB_LIST[0]);
  const [uploadTags, setUploadTags] = useState("");
  const [uploadProductTags, setUploadProductTags] = useState<string[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const fetchDocs = useCallback(() => {
    setLoading(true);
    knowledgeApi
      .list()
      .then((res) => setDocs(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fetchSources = useCallback(() => {
    knowledgeApi
      .listSources()
      .then((res) => setSources(res.data ?? []))
      .catch(console.error);
  }, []);

  const fetchImportTasks = useCallback(() => {
    knowledgeApi
      .importTasks()
      .then((res) => {
        const tasks: ImportTask[] = res.data ?? [];
        setImportTasks(tasks);

        const hasRunning = tasks.some((t) => t.status === "importing");
        if (!hasRunning && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          fetchDocs();
          fetchSources();
        }
      })
      .catch(console.error);
  }, [fetchDocs, fetchSources]);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    fetchImportTasks();
    pollRef.current = setInterval(fetchImportTasks, 3000);
  }, [fetchImportTasks]);

  useEffect(() => {
    fetchDocs();
    fetchImportTasks();
    fetchSources();
    productApi.list().then((res) => {
      const data = res.data ?? [];
      console.log(`[Knowledge] Loaded ${data.length} products`);
      setProducts(data);
    }).catch((err) => {
      console.error("[Knowledge] Failed to load products:", err?.message);
    });
    solutionApi.list().then((res) => {
      const data = res.data ?? [];
      console.log(`[Knowledge] Loaded ${data.length} solutions`);
      setSolutions(data);
    }).catch((err) => {
      console.error("[Knowledge] Failed to load solutions:", err?.message);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const hasRunning = importTasks.some((t) => t.status === "importing");
    if (hasRunning && !pollRef.current) {
      pollRef.current = setInterval(fetchImportTasks, 3000);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [importTasks, fetchImportTasks]);

  const filteredDocs = docs.filter((d) => {
    if (activeTab !== "all" && d.knowledge_base !== activeTab) return false;
    if (productFilter && !(d.tags ?? []).includes(productFilter)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = (d.title || "").toLowerCase();
      const fileName = (d.file_name || "").toLowerCase();
      const desc = (d.description || "").toLowerCase();
      if (!title.includes(q) && !fileName.includes(q) && !desc.includes(q)) return false;
    }
    return true;
  });

  const resetUploadForm = () => {
    setUploadTitle("");
    setUploadDescription("");
    setUploadKb(KB_LIST[0]);
    setUploadTags("");
    setUploadProductTags([]);
    setUploadFile(null);
  };

  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle);
      formData.append("description", uploadDescription);
      formData.append("knowledge_base", uploadKb);
      const allTags = [
        ...uploadTags.split(",").map((t) => t.trim()).filter(Boolean),
        ...uploadProductTags,
      ];
      if (allTags.length > 0) {
        formData.append("tags", JSON.stringify([...new Set(allTags)]));
      }
      await knowledgeApi.upload(formData);
      setUploadOpen(false);
      resetUploadForm();
      fetchDocs();
    } catch (err: any) {
      console.error(err);
      const detail =
        err?.response?.data?.detail || err?.message || "Upload thất bại";
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

  const handleDeleteSource = async (sourceId: string) => {
    try {
      await knowledgeApi.deleteSource(sourceId);
      toast.success("Xóa nguồn thành công");
      fetchSources();
      fetchDocs();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Lỗi xóa nguồn");
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
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex rounded-lg border p-0.5 mr-2">
            <button
              onClick={() => setViewMode("documents")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "documents"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <FileText className="size-3.5" />
              Tài liệu
            </button>
            <button
              onClick={() => setViewMode("sources")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === "sources"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Database className="size-3.5" />
              Nguồn ({sources.length})
            </button>
          </div>
          <Button variant="outline" onClick={() => setReindexOpen(true)}>
            <RefreshCw className="size-4" />
            Re-index
          </Button>
          <Button variant="outline" onClick={() => setDriveImportOpen(true)}>
            <FolderSync className="size-4" />
            Google Drive
          </Button>
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="size-4" />
            Tải lên
          </Button>
        </div>
      </div>

      {/* Active import indicator */}
      {importTasks.some((t) => t.status === "importing") && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm dark:border-blue-800 dark:bg-blue-950">
          <Loader2 className="size-4 animate-spin text-blue-600" />
          <span className="font-medium text-blue-700 dark:text-blue-300">
            {importTasks.filter((t) => t.status === "importing").length} import đang chạy...
          </span>
        </div>
      )}

      {/* ─── Sources View ─── */}
      {viewMode === "sources" ? (
        <SourcesPanel
          sources={sources}
          products={products}
          onDelete={handleDeleteSource}
          onRefresh={fetchSources}
        />
      ) : (
        /* ─── Documents View ─── */
        <>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v ?? "all")}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <TabsList>
                <TabsTrigger value="all">Tất cả</TabsTrigger>
                {KB_LIST.map((kb) => (
                  <TabsTrigger key={kb} value={kb}>
                    {DEPARTMENTS[kb as keyof typeof DEPARTMENTS] ?? kb}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm tài liệu..."
                    className="pl-8 h-8 w-[220px] text-sm"
                  />
                </div>

              {products.length > 0 && (
                <>
                  <Package className="size-4 text-muted-foreground" />
                  <Select value={productFilter || "_all"} onValueChange={(v) => setProductFilter(v === "_all" ? "" : (v ?? ""))}>
                    <SelectTrigger className="w-[180px] h-8 text-sm">
                      <SelectValue placeholder="Sản phẩm..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">Tất cả sản phẩm</SelectItem>
                      {products.map((p) => (
                        <SelectItem key={p.slug} value={p.slug}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              </div>
            </div>

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
                        <TableHead>Nguồn</TableHead>
                        <TableHead>KB</TableHead>
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead>Sections</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Người tải</TableHead>
                        <TableHead className="text-right">Hành động</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocs.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={9}
                            className="text-center py-8 text-muted-foreground"
                          >
                            Chưa có tài liệu nào
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDocs.map((doc: any) => (
                          <TableRow key={doc.id}>
                            {/* Document title + description */}
                            <TableCell className="font-medium max-w-[260px]">
                              <div className="flex items-start gap-2">
                                <FileText className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                                <div className="min-w-0">
                                  <p className="truncate text-sm">{doc.title}</p>
                                  {doc.description && (
                                    <p className="truncate text-xs text-muted-foreground">
                                      {doc.description}
                                    </p>
                                  )}
                                  {doc.file_name && doc.file_name !== doc.title && (
                                    <p className="truncate text-[11px] text-muted-foreground/70">
                                      {doc.file_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            {/* Source */}
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <SourceIcon type={doc.source_type} />
                                <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                  {doc.source_name || sourceLabel(doc.source_type)}
                                </span>
                              </div>
                            </TableCell>
                            {/* KB */}
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {DEPARTMENTS[
                                  doc.knowledge_base as keyof typeof DEPARTMENTS
                                ] ?? doc.knowledge_base}
                              </Badge>
                            </TableCell>
                            {/* Products */}
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(doc.tags ?? [])
                                  .filter((t: string) => products.some((p) => p.slug === t))
                                  .map((t: string) => (
                                    <Badge key={t} variant="outline" className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                      {products.find((p) => p.slug === t)?.name ?? t}
                                    </Badge>
                                  ))}
                              </div>
                            </TableCell>
                            {/* Type */}
                            <TableCell className="text-xs">
                              <Badge variant="outline" className="text-[10px]">
                                {doc.file_type ?? "-"}
                              </Badge>
                            </TableCell>
                            {/* Sections */}
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Layers className="size-3 text-muted-foreground" />
                                <span className="text-xs">
                                  {doc.sections_count ?? doc.chunks_count ?? 0}
                                </span>
                              </div>
                            </TableCell>
                            {/* Status */}
                            <TableCell>
                              <Badge
                                className={`text-[10px] ${
                                  STATUS_COLORS[doc.status] ??
                                  STATUS_COLORS.processing
                                }`}
                              >
                                {DOC_STATUS[
                                  doc.status as keyof typeof DOC_STATUS
                                ] ?? doc.status}
                              </Badge>
                            </TableCell>
                            {/* Uploaded by + date */}
                            <TableCell className="text-xs text-muted-foreground">
                              <div>
                                {doc.uploaded_by_name && (
                                  <div className="flex items-center gap-1">
                                    <User className="size-3" />
                                    <span className="truncate max-w-[80px]">{doc.uploaded_by_name}</span>
                                  </div>
                                )}
                                <span>
                                  {doc.created_at
                                    ? format(new Date(doc.created_at), "dd/MM/yy", {
                                        locale: vi,
                                      })
                                    : "-"}
                                </span>
                              </div>
                            </TableCell>
                            {/* Actions */}
                            <TableCell>
                              <div className="flex items-center justify-end gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => setEditDoc(doc)}
                                  title="Chỉnh sửa"
                                >
                                  <Pencil className="size-3.5 text-muted-foreground" />
                                </Button>
                                {doc.drive_url && (
                                  <a
                                    href={doc.drive_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      title="Mở trên Drive"
                                    >
                                      <ExternalLink className="size-3.5 text-blue-500" />
                                    </Button>
                                  </a>
                                )}
                                {doc.download_url && (
                                  <a
                                    href={doc.download_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      title="Tải xuống"
                                    >
                                      <Download className="size-3.5" />
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
                                    <Trash2 className="size-3.5 text-destructive" />
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
        </>
      )}

      {/* Import Tasks Panel */}
      <ImportTasksPanel tasks={importTasks} />

      {/* Upload Dialog */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) resetUploadForm();
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
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
              <Label>Mô tả (tùy chọn)</Label>
              <Textarea
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Mô tả ngắn về nội dung tài liệu..."
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label>Knowledge Base</Label>
              <Select
                value={uploadKb}
                onValueChange={(v) => setUploadKb(v ?? "")}
              >
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
              <Label htmlFor="upload-tags">
                Tags (phân cách bằng dấu phẩy)
              </Label>
              <Input
                id="upload-tags"
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
              />
            </div>

            <ProductTagSelector
              products={products}
              solutions={solutions}
              selected={uploadProductTags}
              onChange={setUploadProductTags}
            />
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

      {/* Drive Import Dialog */}
      <DriveImportDialog
        open={driveImportOpen}
        onOpenChange={setDriveImportOpen}
        onStarted={() => {
          startPolling();
          fetchSources();
        }}
        products={products}
        solutions={solutions}
      />

      {/* Edit Document Dialog */}
      <EditDocumentDialog
        doc={editDoc}
        products={products}
        solutions={solutions}
        onClose={() => setEditDoc(null)}
        onSaved={fetchDocs}
      />

      {/* Re-index by URL Dialog */}
      <ReindexByUrlDialog
        open={reindexOpen}
        onOpenChange={setReindexOpen}
        onStarted={() => {
          startPolling();
          fetchDocs();
        }}
      />
    </div>
  );
}
