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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Presentation,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  Download,
  ArrowRight,
  ArrowLeft,
  Search,
  Sparkles,
} from "lucide-react";
import { proposalApi } from "@/lib/api-client";
import { INDUSTRIES } from "@/lib/constants";
import type {
  ProposalTask,
  ProductConfig,
  RFIQuestion,
  LegalEntity,
} from "@/lib/types";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

/* ─── RFI Form ─── */
function RFIForm({
  questions,
  answers,
  onChange,
}: {
  questions: RFIQuestion[];
  answers: Record<string, any>;
  onChange: (id: string, value: any) => void;
}) {
  return (
    <div className="grid gap-4">
      {questions.map((q) => (
        <div key={q.id} className="grid gap-1.5">
          <Label className="text-sm">
            {q.label}
            {q.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {q.type === "text" && (
            <Input
              value={answers[q.id] ?? ""}
              onChange={(e) => onChange(q.id, e.target.value)}
              placeholder={q.label}
            />
          )}
          {q.type === "number" && (
            <Input
              type="number"
              value={answers[q.id] ?? ""}
              onChange={(e) => onChange(q.id, e.target.value)}
              placeholder="0"
            />
          )}
          {q.type === "textarea" && (
            <Textarea
              value={answers[q.id] ?? ""}
              onChange={(e) => onChange(q.id, e.target.value)}
              placeholder={q.label}
              rows={3}
            />
          )}
          {q.type === "select" && q.options && (
            <Select
              value={answers[q.id] ?? ""}
              onValueChange={(v) => onChange(q.id, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn..." />
              </SelectTrigger>
              <SelectContent>
                {q.options.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {q.type === "multi_select" && q.options && (
            <div className="flex flex-wrap gap-3">
              {q.options.map((opt) => {
                const selected: string[] = answers[q.id] ?? [];
                const checked = selected.includes(opt);
                return (
                  <label
                    key={opt}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => {
                        if (c) onChange(q.id, [...selected, opt]);
                        else onChange(q.id, selected.filter((s) => s !== opt));
                      }}
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Main Page ─── */
export default function ProposalsPage() {
  // Step state
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 form
  const [customerName, setCustomerName] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("chung");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [customProduct, setCustomProduct] = useState("");
  const [brief, setBrief] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>({});

  // Step 2 form
  const [rfiQuestions, setRfiQuestions] = useState<RFIQuestion[]>([]);
  const [rfiAnswers, setRfiAnswers] = useState<Record<string, any>>({});
  const [legalEntity, setLegalEntity] = useState("omijsc");
  const [outputFormat, setOutputFormat] = useState<"pptx" | "docx">("pptx");
  const [slideMethodDesign, setSlideMethodDesign] = useState(true);   // pptxgenjs (design)
  const [slideMethodTemplate, setSlideMethodTemplate] = useState(true); // python-pptx (template)
  const [submitting, setSubmitting] = useState(false);
  const [parsingBrief, setParsingBrief] = useState(false);

  // Data from API
  const [products, setProducts] = useState<ProductConfig[]>([]);
  const [entities, setEntities] = useState<LegalEntity[]>([]);

  // Tasks
  const [tasks, setTasks] = useState<ProposalTask[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load products & entities on mount
  useEffect(() => {
    proposalApi.getProducts().then((r) => setProducts(r.data)).catch(() => {});
    proposalApi.getEntities().then((r) => setEntities(r.data)).catch(() => {});
    fetchTasks();
  }, []);

  const fetchTasks = useCallback(() => {
    proposalApi
      .tasks()
      .then((r) => {
        const t: ProposalTask[] = r.data ?? [];
        setTasks(t);
        const hasRunning = t.some(
          (x) =>
            x.status === "generating_content" ||
            x.status === "creating_document"
        );
        if (!hasRunning && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      })
      .catch(() => {});
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    fetchTasks();
    pollRef.current = setInterval(fetchTasks, 3000);
  }, [fetchTasks]);

  useEffect(() => {
    const hasRunning = tasks.some(
      (t) =>
        t.status === "generating_content" || t.status === "creating_document"
    );
    if (hasRunning && !pollRef.current) {
      pollRef.current = setInterval(fetchTasks, 3000);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [tasks, fetchTasks]);

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
      // Silent fail for auto-lookup
    } finally {
      setLookingUp(false);
    }
  };

  // Handlers
  const handleLookup = async () => {
    if (!taxCode && !website) {
      toast.error("Nhập MST hoặc website để tra cứu");
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
      toast.success("Đã tra cứu thông tin doanh nghiệp");
    } catch {
      toast.error("Không tìm thấy thông tin");
    } finally {
      setLookingUp(false);
    }
  };

  const handleNext = async () => {
    if (!customerName.trim()) {
      toast.error("Vui lòng nhập tên khách hàng");
      return;
    }

    // Load RFI template
    try {
      const res = await proposalApi.getRfi(industry);
      setRfiQuestions(res.data.questions ?? []);
    } catch {
      // fallback to chung
      try {
        const res = await proposalApi.getRfi("chung");
        setRfiQuestions(res.data.questions ?? []);
      } catch {
        setRfiQuestions([]);
      }
    }

    // Parse brief with AI if provided
    if (brief.trim()) {
      setParsingBrief(true);
      try {
        const res = await proposalApi.parseBrief({
          brief: brief.trim(),
          industry,
          products: selectedProducts,
        });
        if (res.data.answers) {
          setRfiAnswers(res.data.answers);
        }
      } catch {
        // ok, user fills manually
      } finally {
        setParsingBrief(false);
      }
    }

    setStep(2);
  };

  const handleGenerate = async () => {
    setSubmitting(true);
    try {
      const allProducts = [...selectedProducts];
      if (customProduct.trim()) allProducts.push(customProduct.trim());

      const slideMethods = [];
      if (slideMethodDesign) slideMethods.push("design");
      if (slideMethodTemplate) slideMethods.push("template");

      await proposalApi.generate({
        customer_name: customerName.trim(),
        industry,
        products: allProducts,
        rfi_answers: rfiAnswers,
        company_info: companyInfo,
        legal_entity: legalEntity,
        output_format: outputFormat,
        brief_text: brief.trim(),
        slide_methods: outputFormat === "pptx" ? slideMethods : undefined,
      });

      toast.success("Đang tạo proposal! Vui lòng chờ...");
      startPolling();

      // Reset form
      setStep(1);
      setCustomerName("");
      setTaxCode("");
      setWebsite("");
      setIndustry("chung");
      setSelectedProducts([]);
      setCustomProduct("");
      setBrief("");
      setCompanyInfo({});
      setRfiAnswers({});
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail || err?.message || "Lỗi tạo proposal";
      toast.error(detail);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Presentation className="size-6 text-primary" />
          Tạo Proposal
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tạo proposal chuyên nghiệp cho khách hàng với AI hỗ trợ
        </p>
      </div>

      {/* Active task indicator */}
      {tasks.some(
        (t) =>
          t.status === "generating_content" ||
          t.status === "creating_document"
      ) && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-800 dark:bg-blue-950">
          <Loader2 className="size-5 animate-spin text-blue-600" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-blue-700 dark:text-blue-300">
              {tasks.filter(
                (t) =>
                  t.status === "generating_content" ||
                  t.status === "creating_document"
              ).length}{" "}
              proposal đang được tạo...
            </p>
            <p className="text-xs text-blue-600/70">
              {tasks
                .filter(
                  (t) =>
                    t.status === "generating_content" ||
                    t.status === "creating_document"
                )
                .map((t) => `${t.customer_name} (${t.status === "generating_content" ? "AI đang viết" : "Đang tạo file"})`)
                .join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Wizard Steps Indicator */}
      <div className="flex items-center gap-4">
        <div
          className={`flex items-center gap-2 ${
            step === 1 ? "text-primary font-semibold" : "text-muted-foreground"
          }`}
        >
          <div
            className={`flex size-7 items-center justify-center rounded-full text-sm ${
              step === 1
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            1
          </div>
          Thông tin khách hàng
        </div>
        <ArrowRight className="size-4 text-muted-foreground" />
        <div
          className={`flex items-center gap-2 ${
            step === 2 ? "text-primary font-semibold" : "text-muted-foreground"
          }`}
        >
          <div
            className={`flex size-7 items-center justify-center rounded-full text-sm ${
              step === 2
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            2
          </div>
          Khảo sát & Tạo
        </div>
      </div>

      {/* ─── STEP 1 ─── */}
      {step === 1 && (
        <div className="rounded-lg border p-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>
                Tên công ty / Khách hàng <span className="text-red-500">*</span>
              </Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Công ty ABC"
              />
            </div>
            <div className="grid gap-2">
              <Label>Ngành nghề</Label>
              <Select value={industry} onValueChange={(v) => v && setIndustry(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind.value} value={ind.value}>
                      {ind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* MST + Website + Lookup */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Mã số thuế (MST)</Label>
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
                Tra cứu DN
              </Button>
            </div>
          </div>

          {/* Company info result */}
          {companyInfo.source && companyInfo.source !== "manual" && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm dark:border-green-800 dark:bg-green-950">
              <p className="font-medium text-green-700 dark:text-green-300 flex items-center gap-1.5">
                <CheckCircle2 className="size-4" />
                Thông tin doanh nghiệp
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
              {companyInfo.website_analysis?.industry && (
                <p className="text-xs text-green-600/80 dark:text-green-400/80">
                  Ngành: {companyInfo.website_analysis.industry}
                </p>
              )}
            </div>
          )}

          {/* Products */}
          <div className="grid gap-2">
            <Label>Sản phẩm quan tâm</Label>
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
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={customProduct.length > 0}
                  onCheckedChange={(c) => {
                    if (!c) setCustomProduct("");
                  }}
                />
                <Input
                  value={customProduct}
                  onChange={(e) => setCustomProduct(e.target.value)}
                  placeholder="Khác..."
                  className="h-8 w-40"
                />
              </div>
            </div>
          </div>

          {/* Brief */}
          <div className="grid gap-2">
            <Label className="flex items-center gap-1.5">
              Brief
              <Badge variant="secondary" className="text-[10px]">
                <Sparkles className="size-3 mr-0.5" />
                AI đọc và tự điền RFI
              </Badge>
            </Label>
            <Textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Paste brief từ khách hàng hoặc mô tả nhu cầu. AI sẽ tự phân tích và điền vào các câu hỏi khảo sát ở bước tiếp theo..."
              rows={5}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleNext} disabled={!customerName.trim()}>
              {parsingBrief ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  AI đang phân tích brief...
                </>
              ) : (
                <>
                  Tiếp tục
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ─── STEP 2 ─── */}
      {step === 2 && (
        <div className="rounded-lg border p-6 space-y-5">
          {/* Summary */}
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium">
              {customerName} —{" "}
              {INDUSTRIES.find((i) => i.value === industry)?.label ?? industry}
            </p>
            <p className="text-muted-foreground">
              Sản phẩm: {selectedProducts.join(", ")}
              {customProduct && `, ${customProduct}`}
            </p>
          </div>

          {/* RFI Questions */}
          {rfiQuestions.length > 0 ? (
            <>
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  Bảng khảo sát (RFI)
                </h3>
                {brief.trim() && (
                  <p className="text-xs text-muted-foreground mb-3">
                    <Sparkles className="size-3 inline mr-1" />
                    AI đã điền sẵn từ brief. Vui lòng kiểm tra và bổ sung.
                  </p>
                )}
                <RFIForm
                  questions={rfiQuestions}
                  answers={rfiAnswers}
                  onChange={(id, val) =>
                    setRfiAnswers((prev) => ({ ...prev, [id]: val }))
                  }
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Không có bộ câu hỏi RFI cho ngành này.
            </p>
          )}

          {/* Legal Entity + Format */}
          <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
            <div className="grid gap-2">
              <Label>Pháp nhân</Label>
              <Select
                value={legalEntity}
                onValueChange={(v) => v && setLegalEntity(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Định dạng đầu ra</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="format"
                    value="pptx"
                    checked={outputFormat === "pptx"}
                    onChange={() => setOutputFormat("pptx")}
                    className="accent-primary"
                  />
                  <Presentation className="size-4" />
                  PowerPoint (PPTX)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="format"
                    value="docx"
                    checked={outputFormat === "docx"}
                    onChange={() => setOutputFormat("docx")}
                    className="accent-primary"
                  />
                  <FileText className="size-4" />
                  Word (DOCX)
                </label>
              </div>
            </div>
            {outputFormat === "pptx" && (
              <div className="grid gap-2">
                <Label>Phương pháp tạo slide</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={slideMethodDesign}
                      onCheckedChange={(v) => setSlideMethodDesign(!!v)}
                    />
                    Design (pptxgenjs)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={slideMethodTemplate}
                      onCheckedChange={(v) => setSlideMethodTemplate(!!v)}
                    />
                    Template-based
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Chọn cả 2 để so sánh. Design tạo slide đẹp từ scratch. Template dùng layout từ file PPTX đã upload.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="size-4" />
              Quay lại
            </Button>
            <Button onClick={handleGenerate} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Tạo Proposal
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* History Table — always visible */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Lịch sử Proposal</h3>
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
          </Badge>
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Sản phẩm</TableHead>
                <TableHead>Pháp nhân</TableHead>
                <TableHead>Định dạng</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead className="text-right">Tải xuống</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Chưa có proposal nào
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((t) => {
                  const isRunning =
                    t.status === "generating_content" ||
                    t.status === "creating_document";
                  return (
                    <TableRow key={t.task_id}>
                      <TableCell>
                        {isRunning ? (
                          <Loader2 className="size-4 animate-spin text-blue-600" />
                        ) : t.status === "error" ? (
                          <XCircle className="size-4 text-red-500" />
                        ) : (
                          <CheckCircle2 className="size-4 text-green-500" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {t.customer_name}
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">
                        {t.products?.join(", ")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {entities.find((e) => e.id === t.legal_entity)
                            ?.label ?? t.legal_entity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {t.output_format?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge
                            className={
                              t.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : t.status === "error"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                            }
                          >
                            {t.status === "completed"
                              ? "Hoàn tất"
                              : t.status === "error"
                              ? "Lỗi"
                              : t.status === "generating_content"
                              ? "AI đang viết..."
                              : "Đang tạo file..."}
                          </Badge>
                          {t.status === "error" && t.error && (
                            <p className="text-xs text-red-500 mt-1 line-clamp-1">
                              {t.error}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {t.started_at
                          ? format(
                              new Date(t.started_at),
                              "dd/MM/yyyy HH:mm",
                              { locale: vi }
                            )
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {t.status === "completed" && t.file_name && (
                          <div className="flex gap-1 justify-end">
                            {((t as any).all_files && (t as any).all_files.length > 1) ? (
                              (t as any).all_files.map((f: string, fi: number) => {
                                const label = f.includes("_design") ? "Design" : f.includes("_template") ? "Template" : "Tải";
                                return (
                                  <a key={fi} href={`${proposalApi.downloadUrl(t.task_id)}?file=${encodeURIComponent(f)}`} target="_blank" rel="noopener noreferrer">
                                    <Button size="sm" variant="outline" className="text-xs">
                                      <Download className="size-3" />
                                      {label}
                                    </Button>
                                  </a>
                                );
                              })
                            ) : (
                              <a href={proposalApi.downloadUrl(t.task_id)} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="outline">
                                  <Download className="size-4" />
                                  Tải
                                </Button>
                              </a>
                            )}
                          </div>
                        )}
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
