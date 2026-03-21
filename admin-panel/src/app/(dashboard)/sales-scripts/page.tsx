"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  PhoneCall,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  Sparkles,
  Copy,
  Mail,
  MessageCircle,
  Phone,
  Trash2,
  Eye,
  ArrowLeft,
} from "lucide-react";
import { salesScriptApi, proposalApi, solutionApi } from "@/lib/api-client";
import type { SalesScript, ProductConfig } from "@/lib/types";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const TARGET_DEPARTMENTS = [
  "Giam doc/CEO",
  "IT Manager",
  "CSKH Manager",
  "Sales Manager",
  "Marketing Manager",
  "CFO/Ke toan",
];

/* ─── Script Viewer (detail modal) ─── */
function ScriptViewer({
  script,
  onBack,
}: {
  script: SalesScript;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "telesales" | "email" | "message"
  >("telesales");

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`Da sao chep ${label}`);
    });
  };

  const tabs = [
    {
      id: "telesales" as const,
      label: "Telesales",
      icon: Phone,
      content: script.telesales_script,
    },
    {
      id: "email" as const,
      label: "Email",
      icon: Mail,
      content: script.email_template,
    },
    {
      id: "message" as const,
      label: "Tin nhan",
      icon: MessageCircle,
      content: script.message_template,
    },
  ];

  const currentTab = tabs.find((t) => t.id === activeTab)!;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Quay lai
        </Button>
        <div>
          <h2 className="text-lg font-semibold">{script.customer_name}</h2>
          <p className="text-xs text-muted-foreground">
            {script.target_department} &middot;{" "}
            {script.created_at
              ? format(new Date(script.created_at), "dd/MM/yyyy HH:mm", {
                  locale: vi,
                })
              : ""}
          </p>
        </div>
      </div>

      {/* Company Analysis */}
      {script.company_analysis && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-800 dark:bg-blue-950">
          <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">
            Phan tich khach hang
          </p>
          <p className="text-blue-600 dark:text-blue-400 whitespace-pre-wrap">
            {script.company_analysis}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border p-4">
        <div className="flex justify-end mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              copyToClipboard(currentTab.content, currentTab.label)
            }
          >
            <Copy className="size-3.5" />
            Sao chep
          </Button>
        </div>
        <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
          {currentTab.content || (
            <span className="text-muted-foreground italic">
              Chua co noi dung
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function SalesScriptsPage() {
  // Form state
  const [customerName, setCustomerName] = useState("");
  const [website, setWebsite] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [targetDepartment, setTargetDepartment] = useState(
    TARGET_DEPARTMENTS[0]
  );
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [companyInfo, setCompanyInfo] = useState<Record<string, any>>({});

  // Products from API
  const [products, setProducts] = useState<ProductConfig[]>([]);

  // Scripts list
  const [scripts, setScripts] = useState<SalesScript[]>([]);
  const [viewingScript, setViewingScript] = useState<SalesScript | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load products and scripts on mount
  useEffect(() => {
    proposalApi
      .getProducts()
      .then((r) => setProducts(r.data))
      .catch(() => {});
    // Also try solutions
    solutionApi
      .list()
      .then((r) => {
        const sols = r.data ?? [];
        if (sols.length > 0 && products.length === 0) {
          setProducts(
            sols.map((s: { slug: string; name: string }) => ({
              id: s.slug,
              label: s.name,
            }))
          );
        }
      })
      .catch(() => {});
    fetchScripts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchScripts = useCallback(() => {
    salesScriptApi
      .list()
      .then((r) => {
        const list: SalesScript[] = r.data ?? [];
        setScripts(list);
        const hasRunning = list.some((s) => s.status === "generating");
        if (!hasRunning && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      })
      .catch(() => {});
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    fetchScripts();
    pollRef.current = setInterval(fetchScripts, 3000);
  }, [fetchScripts]);

  useEffect(() => {
    const hasRunning = scripts.some((s) => s.status === "generating");
    if (hasRunning && !pollRef.current) {
      pollRef.current = setInterval(fetchScripts, 3000);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [scripts, fetchScripts]);

  // Auto-lookup when website or taxCode changes (debounced)
  useEffect(() => {
    if (!website && !taxCode) return;
    const timer = setTimeout(() => {
      handleLookupAuto();
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [website, taxCode]);

  const handleLookupAuto = async () => {
    if (!taxCode && !website) return;
    if (lookingUp) return;
    setLookingUp(true);
    try {
      const res = await proposalApi.lookupCompany({
        tax_code: taxCode,
        website: website,
        company_name: customerName,
      });
      setCompanyInfo(res.data);
      if (res.data.company_name && !customerName) {
        setCustomerName(res.data.company_name);
      }
    } catch {
      // Silent fail
    } finally {
      setLookingUp(false);
    }
  };

  const handleLookup = async () => {
    if (!taxCode && !website) {
      toast.error("Nhap MST hoac website de tra cuu");
      return;
    }
    setLookingUp(true);
    try {
      const res = await proposalApi.lookupCompany({
        tax_code: taxCode,
        website: website,
        company_name: customerName,
      });
      setCompanyInfo(res.data);
      if (res.data.company_name && !customerName) {
        setCustomerName(res.data.company_name);
      }
      toast.success("Da tra cuu thong tin doanh nghiep");
    } catch {
      toast.error("Khong tim thay thong tin");
    } finally {
      setLookingUp(false);
    }
  };

  const handleGenerate = async () => {
    if (!customerName.trim()) {
      toast.error("Vui long nhap ten khach hang");
      return;
    }
    setSubmitting(true);
    try {
      await salesScriptApi.generate({
        customer_name: customerName.trim(),
        website: website.trim(),
        tax_code: taxCode.trim(),
        target_department: targetDepartment,
        products: selectedProducts,
        notes: notes.trim(),
      });
      toast.success("Dang tao kich ban sales! Vui long cho...");
      startPolling();

      // Reset form
      setCustomerName("");
      setWebsite("");
      setTaxCode("");
      setTargetDepartment(TARGET_DEPARTMENTS[0]);
      setSelectedProducts([]);
      setNotes("");
      setCompanyInfo({});
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail || err?.message || "Loi tao kich ban";
      toast.error(detail);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await salesScriptApi.delete(id);
      setScripts((prev) => prev.filter((s) => s.id !== id));
      toast.success("Da xoa kich ban");
    } catch {
      toast.error("Loi xoa kich ban");
    }
  };

  const handleView = async (script: SalesScript) => {
    if (script.status === "completed") {
      try {
        const res = await salesScriptApi.get(script.id);
        setViewingScript(res.data);
      } catch {
        setViewingScript(script);
      }
    }
  };

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // If viewing a script detail
  if (viewingScript) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PhoneCall className="size-6 text-primary" />
            Kich ban Sales
          </h1>
        </div>
        <ScriptViewer
          script={viewingScript}
          onBack={() => setViewingScript(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PhoneCall className="size-6 text-primary" />
          Kich ban Sales
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tao kich ban telesales, email va tin nhan de tiep can khach hang
        </p>
      </div>

      {/* Active generation indicator */}
      {scripts.some((s) => s.status === "generating") && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-800 dark:bg-blue-950">
          <Loader2 className="size-5 animate-spin text-blue-600" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-blue-700 dark:text-blue-300">
              {scripts.filter((s) => s.status === "generating").length} kich ban
              dang duoc tao...
            </p>
            <p className="text-xs text-blue-600/70">
              {scripts
                .filter((s) => s.status === "generating")
                .map((s) => s.customer_name)
                .join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* ─── FORM ─── */}
      <div className="rounded-lg border p-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>
              Ten cong ty / Khach hang <span className="text-red-500">*</span>
            </Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Cong ty ABC"
            />
          </div>
          <div className="grid gap-2">
            <Label>Doi tuong tiep can</Label>
            <Select
              value={targetDepartment}
              onValueChange={(v) => v && setTargetDepartment(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TARGET_DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* MST + Website + Lookup */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label>Ma so thue (MST)</Label>
            <Input
              value={taxCode}
              onChange={(e) => setTaxCode(e.target.value)}
              placeholder="0123456789"
            />
          </div>
          <div className="grid gap-2">
            <Label>Website</Label>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="company.com"
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={handleLookup}
              disabled={lookingUp || (!taxCode && !website)}
            >
              {lookingUp ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              Tra cuu DN
            </Button>
          </div>
        </div>

        {/* Company info result */}
        {companyInfo.source &&
          companyInfo.source !== "manual" && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm dark:border-green-800 dark:bg-green-950">
              <p className="font-medium text-green-700 dark:text-green-300 flex items-center gap-1.5">
                <CheckCircle2 className="size-4" />
                Thong tin doanh nghiep
              </p>
              {companyInfo.company_name && (
                <p className="text-green-600 dark:text-green-400">
                  {companyInfo.company_name}
                </p>
              )}
              {companyInfo.address && (
                <p className="text-xs text-green-600/80 dark:text-green-400/80">
                  {companyInfo.address}
                </p>
              )}
            </div>
          )}

        {/* Products */}
        <div className="grid gap-2">
          <Label>San pham de xuat</Label>
          <div className="flex flex-wrap gap-3">
            {products.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={selectedProducts.includes(p.id)}
                  onCheckedChange={() => toggleProduct(p.id)}
                />
                {p.label}
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="grid gap-2">
          <Label>Ghi chu cho AI</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Thong tin bo sung: nhu cau cu the, lich su lien he, diem can luu y..."
            rows={3}
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleGenerate}
            disabled={submitting || !customerName.trim()}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Dang gui...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Tao kich ban Sales
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ─── HISTORY ─── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Lich su kich ban</h3>
          <Badge variant="secondary" className="text-xs">
            {scripts.length}
          </Badge>
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Khach hang</TableHead>
                <TableHead>Doi tuong</TableHead>
                <TableHead>San pham</TableHead>
                <TableHead>Trang thai</TableHead>
                <TableHead>Thoi gian</TableHead>
                <TableHead className="text-right">Thao tac</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scripts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Chua co kich ban nao
                  </TableCell>
                </TableRow>
              ) : (
                scripts.map((s) => {
                  const isRunning = s.status === "generating";
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        {isRunning ? (
                          <Loader2 className="size-4 animate-spin text-blue-600" />
                        ) : s.status === "error" ? (
                          <XCircle className="size-4 text-red-500" />
                        ) : (
                          <CheckCircle2 className="size-4 text-green-500" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {s.customer_name}
                      </TableCell>
                      <TableCell className="text-xs">
                        {s.target_department}
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">
                        {s.products?.join(", ") || "-"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge
                            className={
                              s.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : s.status === "error"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                            }
                          >
                            {s.status === "completed"
                              ? "Hoan tat"
                              : s.status === "error"
                              ? "Loi"
                              : "Dang tao..."}
                          </Badge>
                          {s.status === "error" && s.error && (
                            <p className="text-xs text-red-500 mt-1 line-clamp-1">
                              {s.error}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.created_at
                          ? format(
                              new Date(s.created_at),
                              "dd/MM/yyyy HH:mm",
                              { locale: vi }
                            )
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {s.status === "completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleView(s)}
                            >
                              <Eye className="size-3.5" />
                              Xem
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(s.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
