"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Trash2,
  Save,
  Settings2,
  GripVertical,
  Edit,
  History,
  RotateCcw,
  X,
  Package,
  FileText,
  ChevronLeft,
  Eye,
} from "lucide-react";
import { productApi, proposalApi, solutionApi } from "@/lib/api-client";
import { INDUSTRIES } from "@/lib/constants";
import type { Product, ProductVersion, RFIQuestion } from "@/lib/types";

interface Solution {
  id: string;
  name: string;
  slug: string;
  description: string;
  product_id: string;
  product_name?: string;
  product_slug?: string;
  aliases: string[];
  status: "active" | "deprecated";
  sort_order: number;
  created_at: string;
  updated_at: string;
  related_docs_count?: number;
}

/* ─── helpers ─── */

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_COLORS: Record<Product["status"], string> = {
  active: "bg-green-100 text-green-800",
  draft: "bg-yellow-100 text-yellow-800",
  deprecated: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<Product["status"], string> = {
  active: "Hoạt động",
  draft: "Nháp",
  deprecated: "Ngừng",
};

/* ─── Tag Editor ─── */

function TagEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = input.trim();
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed]);
      }
      setInput("");
    }
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag, i) => (
          <Badge key={`${tag}-${i}`} variant="secondary" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              onClick={() => remove(i)}
              className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Nhập rồi nhấn Enter để thêm"}
        className="text-sm"
      />
    </div>
  );
}

/* ─── Product Form (used in create + edit dialogs) ─── */

interface ProductFormData {
  name: string;
  slug: string;
  short_description: string;
  full_description: string;
  features: string[];
  use_cases: string[];
  target_industries: string[];
  pricing_model: string;
  competitive_advantages: string[];
  integration_options: string[];
  sort_order: number;
  status: Product["status"];
  version_label: string;
  change_summary: string;
}

function emptyForm(): ProductFormData {
  return {
    name: "",
    slug: "",
    short_description: "",
    full_description: "",
    features: [],
    use_cases: [],
    target_industries: [],
    pricing_model: "",
    competitive_advantages: [],
    integration_options: [],
    sort_order: 0,
    status: "draft",
    version_label: "",
    change_summary: "",
  };
}

function productToForm(p: Product): ProductFormData {
  return {
    name: p.name,
    slug: p.slug,
    short_description: p.short_description,
    full_description: p.full_description,
    features: [...p.features],
    use_cases: [...p.use_cases],
    target_industries: [...p.target_industries],
    pricing_model: p.pricing_model,
    competitive_advantages: [...p.competitive_advantages],
    integration_options: [...p.integration_options],
    sort_order: p.sort_order,
    status: p.status,
    version_label: "",
    change_summary: "",
  };
}

function ProductForm({
  form,
  setForm,
  isEdit,
}: {
  form: ProductFormData;
  setForm: React.Dispatch<React.SetStateAction<ProductFormData>>;
  isEdit: boolean;
}) {
  const update = <K extends keyof ProductFormData>(key: K, val: ProductFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const toggleIndustry = (val: string) => {
    setForm((prev) => {
      const set = new Set(prev.target_industries);
      if (set.has(val)) set.delete(val);
      else set.add(val);
      return { ...prev, target_industries: Array.from(set) };
    });
  };

  return (
    <ScrollArea className="max-h-[70vh] pr-4">
      <div className="space-y-4 py-1">
        {/* Name */}
        <div className="grid gap-1.5">
          <Label>Tên sản phẩm *</Label>
          <Input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="VD: Zalo OA"
          />
        </div>

        {/* Slug */}
        <div className="grid gap-1.5">
          <Label>Slug</Label>
          <Input
            value={form.slug}
            onChange={(e) => update("slug", e.target.value)}
            placeholder="vd: zalo-oa"
            className="font-mono text-sm"
            disabled={isEdit}
          />
        </div>

        {/* Short description */}
        <div className="grid gap-1.5">
          <Label>Mô tả ngắn</Label>
          <Input
            value={form.short_description}
            onChange={(e) => update("short_description", e.target.value)}
            placeholder="Mô tả ngắn gọn về sản phẩm"
          />
        </div>

        {/* Full description */}
        <div className="grid gap-1.5">
          <Label>Mô tả đầy đủ</Label>
          <Textarea
            value={form.full_description}
            onChange={(e) => update("full_description", e.target.value)}
            placeholder="Mô tả chi tiết..."
            rows={4}
          />
        </div>

        {/* Features */}
        <div className="grid gap-1.5">
          <Label>Tính năng</Label>
          <TagEditor
            value={form.features}
            onChange={(v) => update("features", v)}
            placeholder="Nhập tính năng rồi nhấn Enter"
          />
        </div>

        {/* Use cases */}
        <div className="grid gap-1.5">
          <Label>Use cases</Label>
          <TagEditor
            value={form.use_cases}
            onChange={(v) => update("use_cases", v)}
            placeholder="Nhập use case rồi nhấn Enter"
          />
        </div>

        {/* Target industries */}
        <div className="grid gap-1.5">
          <Label>Ngành mục tiêu</Label>
          <div className="flex flex-wrap gap-1.5">
            {INDUSTRIES.map((ind) => {
              const selected = form.target_industries.includes(ind.value);
              return (
                <Badge
                  key={ind.value}
                  variant={selected ? "default" : "outline"}
                  className="cursor-pointer select-none"
                  onClick={() => toggleIndustry(ind.value)}
                >
                  {ind.label}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Pricing model */}
        <div className="grid gap-1.5">
          <Label>Mô hình giá</Label>
          <Textarea
            value={form.pricing_model}
            onChange={(e) => update("pricing_model", e.target.value)}
            placeholder="Mô tả cách tính giá..."
            rows={2}
          />
        </div>

        {/* Competitive advantages */}
        <div className="grid gap-1.5">
          <Label>Lợi thế cạnh tranh</Label>
          <TagEditor
            value={form.competitive_advantages}
            onChange={(v) => update("competitive_advantages", v)}
            placeholder="Nhập lợi thế rồi nhấn Enter"
          />
        </div>

        {/* Integration options */}
        <div className="grid gap-1.5">
          <Label>Tích hợp</Label>
          <TagEditor
            value={form.integration_options}
            onChange={(v) => update("integration_options", v)}
            placeholder="Nhập tùy chọn tích hợp rồi nhấn Enter"
          />
        </div>

        {/* Sort order + Status */}
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Thứ tự sắp xếp</Label>
            <Input
              type="number"
              value={form.sort_order}
              onChange={(e) => update("sort_order", parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Trạng thái</Label>
            <Select
              value={form.status}
              onValueChange={(v) => update("status", v as Product["status"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="draft">Nháp</SelectItem>
                <SelectItem value="deprecated">Ngừng</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Version metadata (edit only) */}
        {isEdit && (
          <div className="rounded-lg border border-dashed p-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground">
              Thông tin phiên bản (tùy chọn)
            </p>
            <div className="grid gap-1.5">
              <Label>Nhãn phiên bản</Label>
              <Input
                value={form.version_label}
                onChange={(e) => update("version_label", e.target.value)}
                placeholder="VD: v2.1 - Thêm tính năng mới"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Tóm tắt thay đổi</Label>
              <Input
                value={form.change_summary}
                onChange={(e) => update("change_summary", e.target.value)}
                placeholder="Mô tả ngắn những gì đã thay đổi"
              />
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

/* ─── Version History Panel ─── */

function VersionHistoryPanel({
  productId,
  onRestore,
}: {
  productId: string;
  onRestore: () => void;
}) {
  const [versions, setVersions] = useState<ProductVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshotDialog, setSnapshotDialog] = useState<ProductVersion | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productApi.listVersions(productId);
      setVersions(res.data ?? []);
    } catch {
      toast.error("Không thể tải lịch sử phiên bản");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const handleRestore = async (ver: number) => {
    setRestoring(ver);
    try {
      await productApi.restoreVersion(productId, ver);
      toast.success(`Đã khôi phục phiên bản ${ver}`);
      onRestore();
    } catch {
      toast.error("Khôi phục thất bại");
    } finally {
      setRestoring(null);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        Đang tải lịch sử...
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        Chưa có lịch sử phiên bản.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {versions.map((v) => (
          <div
            key={v.id}
            className="flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm"
          >
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono text-xs">
                v{v.version_number}
              </Badge>
              <div>
                <span className="font-medium">
                  {v.version_label || `Phiên bản ${v.version_number}`}
                </span>
                {v.change_summary && (
                  <span className="text-muted-foreground ml-2">— {v.change_summary}</span>
                )}
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(v.created_at)}
                  {v.changed_by && ` • ${v.changed_by}`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSnapshotDialog(v)}
                title="Xem phiên bản"
              >
                <Eye className="size-3.5" />
                Xem
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRestore(v.version_number)}
                disabled={restoring === v.version_number}
                title="Khôi phục phiên bản này"
              >
                <RotateCcw className="size-3.5" />
                {restoring === v.version_number ? "..." : "Khôi phục"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Snapshot viewer dialog */}
      <Dialog open={!!snapshotDialog} onOpenChange={() => setSnapshotDialog(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Phiên bản {snapshotDialog?.version_number}
              {snapshotDialog?.version_label && ` — ${snapshotDialog.version_label}`}
            </DialogTitle>
          </DialogHeader>
          {snapshotDialog?.snapshot && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3 text-sm pr-4">
                <div>
                  <span className="font-medium text-muted-foreground">Tên:</span>{" "}
                  {snapshotDialog.snapshot.name}
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Slug:</span>{" "}
                  <code className="text-xs">{snapshotDialog.snapshot.slug}</code>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Mô tả ngắn:</span>{" "}
                  {snapshotDialog.snapshot.short_description || "—"}
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Mô tả đầy đủ:</span>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                    {snapshotDialog.snapshot.full_description || "—"}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Tính năng:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {snapshotDialog.snapshot.features?.map((f, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {f}
                      </Badge>
                    ))}
                    {(!snapshotDialog.snapshot.features ||
                      snapshotDialog.snapshot.features.length === 0) && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Use cases:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {snapshotDialog.snapshot.use_cases?.map((u, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {u}
                      </Badge>
                    ))}
                    {(!snapshotDialog.snapshot.use_cases ||
                      snapshotDialog.snapshot.use_cases.length === 0) && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Mô hình giá:</span>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                    {snapshotDialog.snapshot.pricing_model || "—"}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Lợi thế cạnh tranh:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {snapshotDialog.snapshot.competitive_advantages?.map((c, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {c}
                      </Badge>
                    ))}
                    {(!snapshotDialog.snapshot.competitive_advantages ||
                      snapshotDialog.snapshot.competitive_advantages.length === 0) && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Tích hợp:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {snapshotDialog.snapshot.integration_options?.map((o, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {o}
                      </Badge>
                    ))}
                    {(!snapshotDialog.snapshot.integration_options ||
                      snapshotDialog.snapshot.integration_options.length === 0) && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSnapshotDialog(null)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─── Tab Sản phẩm (Rich Model) ─── */

function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit / Create state
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<ProductFormData>(emptyForm());

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productApi.list();
      setProducts(res.data ?? []);
    } catch {
      toast.error("Không thể tải danh sách sản phẩm");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /* Create */
  const openCreate = () => {
    setForm(emptyForm());
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Tên sản phẩm không được để trống");
      return;
    }
    setSaving(true);
    try {
      const { version_label, change_summary, ...data } = form;
      // Auto-generate slug from name if empty
      if (!data.slug.trim()) {
        data.slug = data.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/đ/g, "d")
          .replace(/[^a-z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "_")
          .replace(/-+/g, "_");
      }
      await productApi.create(data);
      toast.success("Đã tạo sản phẩm mới");
      setCreateOpen(false);
      fetchProducts();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || "Tạo sản phẩm thất bại";
      toast.error(String(detail));
    } finally {
      setSaving(false);
    }
  };

  /* Edit */
  const openEdit = (product: Product) => {
    setEditProduct(product);
    setForm(productToForm(product));
  };

  const closeEdit = () => {
    setEditProduct(null);
  };

  const handleUpdate = async () => {
    if (!editProduct) return;
    if (!form.name.trim()) {
      toast.error("Tên sản phẩm không được để trống");
      return;
    }
    setSaving(true);
    try {
      await productApi.update(editProduct.id, form);
      toast.success("Đã cập nhật sản phẩm");
      closeEdit();
      fetchProducts();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || "Cập nhật thất bại";
      toast.error(String(detail));
    } finally {
      setSaving(false);
    }
  };

  /* Delete */
  const handleDelete = async (id: string) => {
    try {
      await productApi.delete(id);
      toast.success("Đã xoá sản phẩm");
      if (editProduct?.id === id) closeEdit();
      fetchProducts();
    } catch {
      toast.error("Xoá thất bại");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Đang tải...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Quản lý sản phẩm/dịch vụ với mô tả chi tiết và lịch sử phiên bản.
        </p>
        <Button onClick={openCreate} variant="outline" size="sm">
          <Plus className="size-4" />
          Thêm sản phẩm
        </Button>
      </div>

      {/* Product list */}
      {products.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Chưa có sản phẩm nào. Nhấn &quot;Thêm sản phẩm&quot; để bắt đầu.
        </div>
      ) : (
        <div className="grid gap-3">
          {products.map((product) => (
            <Card
              key={product.id}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => openEdit(product)}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <Package className="size-8 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{product.name}</span>
                    <code className="text-xs text-muted-foreground">{product.slug}</code>
                  </div>
                  {product.short_description && (
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {product.short_description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={`text-xs ${STATUS_COLORS[product.status]}`}>
                    {STATUS_LABELS[product.status]}
                  </Badge>
                  {product.version_count != null && product.version_count > 0 && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <History className="size-3" />
                      {product.version_count}
                    </Badge>
                  )}
                  {product.related_docs_count != null && product.related_docs_count > 0 && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <FileText className="size-3" />
                      {product.related_docs_count}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Thêm sản phẩm mới</DialogTitle>
          </DialogHeader>
          <ProductForm form={form} setForm={setForm} isEdit={false} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              <Save className="size-4" />
              {saving ? "Đang tạo..." : "Tạo sản phẩm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editProduct} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="size-4" />
              Chỉnh sửa sản phẩm
            </DialogTitle>
          </DialogHeader>
          <ProductForm form={form} setForm={setForm} isEdit={true} />

          {/* Related documents (read-only) */}
          {editProduct && editProduct.related_docs_count != null && editProduct.related_docs_count > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2.5 text-sm">
              <FileText className="size-4 text-muted-foreground" />
              <span>
                Có <strong>{editProduct.related_docs_count}</strong> tài liệu trong Kho tri thức
                được gắn tag sản phẩm này
              </span>
            </div>
          )}

          {/* Version history */}
          {editProduct && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <History className="size-4" />
                Lịch sử phiên bản
              </div>
              <VersionHistoryPanel
                productId={editProduct.id}
                onRestore={() => {
                  fetchProducts();
                  // Refresh the form data
                  productApi.get(editProduct.id).then((res) => {
                    if (res.data) {
                      setEditProduct(res.data);
                      setForm(productToForm(res.data));
                    }
                  });
                }}
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => editProduct && handleDelete(editProduct.id)}
            >
              <Trash2 className="size-4" />
              Xoá
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={closeEdit}>
              Hủy
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              <Save className="size-4" />
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Tab Giải pháp (Solutions) ─── */

function SolutionsTab() {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSolution, setEditingSolution] = useState<Solution | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formProductId, setFormProductId] = useState("");
  const [formAliases, setFormAliases] = useState<string[]>([]);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [solRes, prodRes] = await Promise.all([
        solutionApi.list(),
        productApi.list(),
      ]);
      setSolutions(solRes.data);
      setProducts(prodRes.data);
    } catch {
      toast.error("Không thể tải danh sách giải pháp");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openCreate() {
    setEditingSolution(null);
    setFormName("");
    setFormSlug("");
    setFormDesc("");
    setFormProductId(products[0]?.id || "");
    setFormAliases([]);
    setFormSortOrder(solutions.length);
    setDialogOpen(true);
  }

  function openEdit(s: Solution) {
    setEditingSolution(s);
    setFormName(s.name);
    setFormSlug(s.slug);
    setFormDesc(s.description);
    setFormProductId(s.product_id);
    setFormAliases(s.aliases || []);
    setFormSortOrder(s.sort_order);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formName.trim()) { toast.error("Tên giải pháp không được trống"); return; }
    if (!formProductId) { toast.error("Chọn sản phẩm liên kết"); return; }
    setSaving(true);
    try {
      const data = {
        name: formName.trim(),
        slug: formSlug.trim(),
        description: formDesc.trim(),
        product_id: formProductId,
        aliases: formAliases,
        sort_order: formSortOrder,
      };
      if (editingSolution) {
        await solutionApi.update(editingSolution.id, data);
        toast.success("Đã cập nhật giải pháp");
      } else {
        await solutionApi.create(data);
        toast.success("Đã tạo giải pháp mới");
      }
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Lỗi lưu giải pháp";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s: Solution) {
    if (!confirm(`Xóa giải pháp "${s.name}"?`)) return;
    try {
      await solutionApi.delete(s.id);
      toast.success("Đã xóa giải pháp");
      fetchData();
    } catch {
      toast.error("Lỗi xóa giải pháp");
    }
  }

  // Group solutions by product
  const grouped = products.map((p) => ({
    product: p,
    solutions: solutions.filter((s) => s.product_id === p.id),
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Giải pháp</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý giải pháp/tên gọi mà khách hàng tìm kiếm, liên kết với sản phẩm chính.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4 mr-1" /> Thêm giải pháp
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Đang tải...</p>
        ) : solutions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Chưa có giải pháp nào. Nhấn &quot;Thêm giải pháp&quot; để bắt đầu.
          </p>
        ) : (
          <div className="space-y-6">
            {grouped.filter(g => g.solutions.length > 0).map(({ product, solutions: sols }) => (
              <div key={product.id}>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="size-4 text-primary" />
                  <span className="font-semibold">{product.name}</span>
                  <Badge variant="outline" className="text-xs">{product.slug}</Badge>
                </div>
                <div className="ml-6 space-y-2">
                  {sols.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{s.name}</span>
                          <Badge variant="secondary" className="text-xs font-mono">{s.slug}</Badge>
                          {(s.related_docs_count || 0) > 0 && (
                            <Badge variant="outline" className="text-xs">
                              <FileText className="size-3 mr-1" />{s.related_docs_count} tài liệu
                            </Badge>
                          )}
                        </div>
                        {s.description && (
                          <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
                        )}
                        {s.aliases.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {s.aliases.map((a) => (
                              <Badge key={a} variant="outline" className="text-xs bg-blue-50">{a}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                          <Edit className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(s)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingSolution ? "Sửa giải pháp" : "Thêm giải pháp mới"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Tên giải pháp *</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="VD: Tổng đài ảo" />
              </div>
              <div>
                <Label>Slug (tự động nếu để trống)</Label>
                <Input value={formSlug} onChange={(e) => setFormSlug(e.target.value)} placeholder="VD: tong_dai_ao" className="font-mono" />
              </div>
              <div>
                <Label>Sản phẩm liên kết *</Label>
                <Select value={formProductId} onValueChange={(v) => setFormProductId(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn sản phẩm">
                      {products.find((p) => p.id === formProductId)?.name || "Chọn sản phẩm"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.slug})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mô tả</Label>
                <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2} placeholder="Mô tả ngắn về giải pháp" />
              </div>
              <div>
                <Label>Từ khóa/Aliases (Enter để thêm)</Label>
                <TagEditor value={formAliases} onChange={setFormAliases} placeholder="VD: cloud pbx, tổng đài ip" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="size-4 mr-1" /> {saving ? "Đang lưu..." : "Lưu"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

/* ─── Tab RFI Templates ─── */

const QUESTION_TYPES: { value: RFIQuestion["type"]; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Textarea" },
  { value: "number", label: "Number" },
  { value: "select", label: "Select" },
  { value: "multi_select", label: "Multi Select" },
];

function RfiTab() {
  const [industry, setIndustry] = useState<string>(INDUSTRIES[0].value);
  const [questions, setQuestions] = useState<RFIQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dialog for adding new industry
  const [addIndustryOpen, setAddIndustryOpen] = useState(false);
  const [newIndustryValue, setNewIndustryValue] = useState("");
  const [newIndustryLabel, setNewIndustryLabel] = useState("");
  const [customIndustries, setCustomIndustries] = useState<
    { value: string; label: string }[]
  >([]);

  const allIndustries = [...INDUSTRIES, ...customIndustries];

  const fetchRfi = useCallback(async (ind: string) => {
    setLoading(true);
    try {
      const res = await proposalApi.getRfi(ind);
      const data = res.data;
      setQuestions(data?.questions ?? []);
    } catch {
      // If not found, start with empty
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRfi(industry);
  }, [industry, fetchRfi]);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}`,
        label: "",
        type: "text",
        required: false,
        options: [],
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, updates: Partial<RFIQuestion>) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...updates } : q))
    );
  };

  const handleSave = async () => {
    const invalid = questions.some((q) => !q.id.trim() || !q.label.trim());
    if (invalid) {
      toast.error("Vui lòng điền đầy đủ ID và nội dung câu hỏi");
      return;
    }
    setSaving(true);
    try {
      await proposalApi.updateRfi(industry, { questions });
      toast.success(`Đã lưu RFI template cho "${allIndustries.find((i) => i.value === industry)?.label ?? industry}"`);
    } catch {
      toast.error("Lưu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleAddIndustry = () => {
    if (!newIndustryValue.trim() || !newIndustryLabel.trim()) {
      toast.error("Vui lòng nhập đầy đủ mã và tên ngành");
      return;
    }
    const exists = allIndustries.some((i) => i.value === newIndustryValue.trim());
    if (exists) {
      toast.error("Mã ngành đã tồn tại");
      return;
    }
    setCustomIndustries((prev) => [
      ...prev,
      { value: newIndustryValue.trim(), label: newIndustryLabel.trim() },
    ]);
    setIndustry(newIndustryValue.trim());
    setAddIndustryOpen(false);
    setNewIndustryValue("");
    setNewIndustryLabel("");
  };

  return (
    <div className="space-y-4">
      {/* Industry selector */}
      <div className="flex items-center gap-3">
        <div className="grid gap-1.5">
          <Label>Ngành nghề</Label>
          <div className="flex items-center gap-2">
            <Select value={industry} onValueChange={(v) => v && setIndustry(v)}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Chọn ngành" />
              </SelectTrigger>
              <SelectContent>
                {allIndustries.map((ind) => (
                  <SelectItem key={ind.value} value={ind.value}>
                    {ind.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setAddIndustryOpen(true)}
              title="Thêm ngành mới"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 self-end">
          <Button onClick={addQuestion} variant="outline" size="sm">
            <Plus className="size-4" />
            Thêm câu hỏi
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm">
            <Save className="size-4" />
            {saving ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </div>

      {/* Questions list */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Đang tải...
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Chưa có câu hỏi RFI cho ngành này. Nhấn &quot;Thêm câu hỏi&quot; để bắt đầu.
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, index) => (
            <div
              key={`${q.id}-${index}`}
              className="rounded-lg border p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <GripVertical className="mt-2.5 size-4 shrink-0 text-muted-foreground" />

                <div className="grid flex-1 gap-3">
                  {/* Row 1: ID + Label */}
                  <div className="grid grid-cols-[180px_1fr] gap-3">
                    <Input
                      value={q.id}
                      onChange={(e) =>
                        updateQuestion(index, { id: e.target.value })
                      }
                      placeholder="ID câu hỏi"
                      className="font-mono text-sm"
                    />
                    <Input
                      value={q.label}
                      onChange={(e) =>
                        updateQuestion(index, { label: e.target.value })
                      }
                      placeholder="Nội dung câu hỏi"
                    />
                  </div>

                  {/* Row 2: Type + Required + Options */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <Select
                      value={q.type}
                      onValueChange={(v) =>
                        updateQuestion(index, {
                          type: v as RFIQuestion["type"],
                        })
                      }
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUESTION_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={q.required ?? false}
                        onChange={(e) =>
                          updateQuestion(index, { required: e.target.checked })
                        }
                        className="rounded border-gray-300"
                      />
                      Bắt buộc
                    </label>

                    {(q.type === "select" || q.type === "multi_select") && (
                      <Badge variant="outline" className="text-xs">
                        {(q.options?.length ?? 0)} lựa chọn
                      </Badge>
                    )}
                  </div>

                  {/* Options (for select/multi_select) */}
                  {(q.type === "select" || q.type === "multi_select") && (
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Các lựa chọn (mỗi dòng một lựa chọn)
                      </Label>
                      <Textarea
                        value={(q.options ?? []).join("\n")}
                        onChange={(e) =>
                          updateQuestion(index, {
                            options: e.target.value
                              .split("\n")
                              .filter((o) => o.trim()),
                          })
                        }
                        placeholder={"Lựa chọn 1\nLựa chọn 2\nLựa chọn 3"}
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeQuestion(index)}
                  title="Xoá câu hỏi"
                  className="shrink-0"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Industry Dialog */}
      <Dialog open={addIndustryOpen} onOpenChange={setAddIndustryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm ngành nghề mới</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Mã ngành (slug)</Label>
              <Input
                value={newIndustryValue}
                onChange={(e) => setNewIndustryValue(e.target.value)}
                placeholder="vd: giao_duc"
                className="font-mono"
              />
            </div>
            <div className="grid gap-2">
              <Label>Tên hiển thị</Label>
              <Input
                value={newIndustryLabel}
                onChange={(e) => setNewIndustryLabel(e.target.value)}
                placeholder="vd: Giáo dục"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddIndustryOpen(false);
                setNewIndustryValue("");
                setNewIndustryLabel("");
              }}
            >
              Hủy
            </Button>
            <Button onClick={handleAddIndustry}>
              <Plus className="size-4" />
              Thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Main Page ─── */

export default function ProposalSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings2 className="size-6 text-primary" />
        <h1 className="text-2xl font-bold">Cấu hình Proposal</h1>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Sản phẩm</TabsTrigger>
          <TabsTrigger value="solutions">Giải pháp</TabsTrigger>
          <TabsTrigger value="rfi">RFI Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          <ProductsTab />
        </TabsContent>

        <TabsContent value="solutions" className="mt-4">
          <SolutionsTab />
        </TabsContent>

        <TabsContent value="rfi" className="mt-4">
          <RfiTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
