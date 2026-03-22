#!/usr/bin/env node
/**
 * Generate professional proposal PPTX using pptxgenjs
 * Usage: node generate_proposal_pptx.js <input.json> <output.pptx>
 */
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

// ── Brand Themes (per legal entity) ──
// Load custom themes from data/themes.json (extracted from uploaded templates)
const DEFAULT_THEME = {
  primary: "2AB8FC", primaryDark: "324A6F", accent: "0C506F",
  highlight: "E67E22", success: "28A745", danger: "E74C3C", teal: "17A2B8",
  bg: "1A2332", bgCard: "1E2D3D", bgLight: "F8F9FA",
  text: "FFFFFF", textBody: "D0D0D0", textMuted: "8899AA",
};

let THEMES = { default: DEFAULT_THEME };
try {
  const themesPath = path.join(__dirname, "..", "data", "themes.json");
  if (fs.existsSync(themesPath)) {
    const customThemes = JSON.parse(fs.readFileSync(themesPath, "utf-8"));
    Object.keys(customThemes).forEach((key) => {
      THEMES[key] = { ...DEFAULT_THEME, ...customThemes[key] };
    });
    console.log(`Loaded ${Object.keys(customThemes).length} custom themes from themes.json`);
  }
} catch (e) {
  console.error("Failed to load themes.json:", e.message);
}

let F = { h: "Arial Black", b: "Arial" }; // May be overridden by font_override in input
const SW = 10, SH = 5.625;
const shadow = () => ({ type: "outer", blur: 6, offset: 2, angle: 135, color: "000000", opacity: 0.15 });

// ── Slide Header (reused) ──
function addHeader(slide, pres, T, title) {
  slide.background = { color: T.bg };
  if (T.isLightTheme) {
    // Light theme: clean style — top accent + title with underline, no dark bar
    slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: SW, h: 0.06, fill: { color: T.primary } });
    slide.addText(title.toUpperCase(), {
      x: 0.5, y: 0.25, w: 8.6, h: 0.65, margin: 0,
      fontSize: 24, fontFace: F.h, color: T.primaryDark, bold: true,
    });
    // Short underline accent
    slide.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 0.9, w: 0.8, h: 0.04, fill: { color: T.primary } });
  } else {
    // Dark theme: accent line + dark header bar
    slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: SW, h: 0.06, fill: { color: T.highlight } });
    slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0.06, w: SW, h: 0.8, fill: { color: T.primaryDark } });
    slide.addText(title.toUpperCase(), {
      x: 0.7, y: 0.12, w: 8.6, h: 0.65, margin: 0,
      fontSize: 22, fontFace: F.h, color: "FFFFFF", bold: true,
    });
  }
}

// Content area Y start (differs by theme)
function contentY(T) { return T.isLightTheme ? 1.15 : 1.1; }

function addFooter(slide, T, label, num, total) {
  const footerColor = T.isLightTheme ? T.textMuted : "AAAAAA";
  // Page number left, company right (matching Claude style)
  slide.addText(`${num} / ${total}`, {
    x: 0.5, y: SH - 0.35, w: 1, h: 0.25, fontSize: 7, fontFace: F.b, color: footerColor, margin: 0,
  });
  slide.addText(`${label}  |  Confidential`, {
    x: SW - 4, y: SH - 0.35, w: 3.5, h: 0.25, fontSize: 7, fontFace: F.b, color: footerColor, align: "right", margin: 0,
  });
}

// ── SLIDE: Cover (with logos) ──
function slideCover(pres, T, data) {
  const s = pres.addSlide();
  s.background = { color: T.bg };

  // Top accent line
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: SW, h: 0.06, fill: { color: T.highlight } });

  // ViHAT logo (top-left) — maintain aspect ratio using sizing: contain
  if (data.vihat_logo && fs.existsSync(data.vihat_logo)) {
    s.addImage({ path: data.vihat_logo, x: 0.5, y: 0.3, w: 1.6, h: 0.55, sizing: { type: "contain", w: 1.6, h: 0.55 } });
  } else {
    s.addText(data.entity_label || "ViHAT", {
      x: 0.5, y: 0.3, w: 2, h: 0.4, fontSize: 14, fontFace: F.h, color: T.primary, margin: 0,
    });
  }

  // "GIẢI PHÁP ĐỀ XUẤT" small label
  s.addText("GIẢI PHÁP ĐỀ XUẤT", {
    x: 0.5, y: 1.2, w: 5, h: 0.3, fontSize: 10, fontFace: F.b, color: T.textMuted, margin: 0,
  });

  // Main title — auto-size font based on length to prevent overflow
  const titleText = (data.title || "GIẢI PHÁP").toUpperCase();
  const titleFontSize = titleText.length > 40 ? 24 : titleText.length > 25 ? 28 : 32;
  s.addText(titleText, {
    x: 0.5, y: 1.55, w: 5.5, h: 1.4, fontSize: titleFontSize, fontFace: F.h,
    color: T.primaryDark || T.text, bold: true, margin: 0, valign: "top",
  });

  // "cho Customer"
  const cleanCustomer = (data.customer || "").replace(/^cho\s+/i, "").trim();
  if (cleanCustomer) {
    s.addText(`cho ${cleanCustomer}`, {
      x: 0.5, y: 3.0, w: 5, h: 0.45, fontSize: 18, fontFace: F.b, color: T.primary, bold: true, margin: 0,
    });
  }

  // Accent underline
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 3.5, w: 0.8, h: 0.04, fill: { color: T.highlight } });

  // Company info at bottom-left
  s.addText(`Thực hiện bởi: ${data.entity_label || ""}\nNgày: ${new Date().toLocaleDateString("vi-VN")}`, {
    x: 0.5, y: SH - 0.8, w: 3, h: 0.55, fontSize: 9, fontFace: F.b, color: T.textMuted, margin: 0,
  });

  // Right side: decorative visual block
  // Use customer logo as hero if available, otherwise abstract accent shape
  if (data.customer_logo && fs.existsSync(data.customer_logo)) {
    // Dark accent block background
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 6.0, y: 0.6, w: 3.8, h: 4.5, fill: { color: T.primaryDark }, rectRadius: 0.2,
    });
    // Customer logo centered large
    s.addImage({
      path: data.customer_logo, x: 6.6, y: 1.2, w: 2.6, h: 2.6,
      sizing: { type: "contain", w: 2.6, h: 2.6 },
    });
    // Solution subtitle below logo
    const shortTitle = titleText.length > 30 ? titleText.substring(0, 30) + "..." : titleText;
    s.addText(shortTitle, {
      x: 6.3, y: 4.0, w: 3.2, h: 0.4, fontSize: 10, fontFace: F.h,
      color: "FFFFFF", align: "center", margin: 0,
    });
    // Accent dot
    s.addShape(pres.shapes.OVAL, {
      x: 7.6, y: 4.45, w: 0.15, h: 0.15, fill: { color: T.primary },
    });
  } else {
    // No customer logo: abstract accent with brand colors
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 6.0, y: 0.6, w: 3.8, h: 4.5, fill: { color: T.primaryDark }, rectRadius: 0.2,
    });
    // Abstract decorative circles
    s.addShape(pres.shapes.OVAL, {
      x: 7.0, y: 1.5, w: 2.0, h: 2.0, fill: { color: T.primary, transparency: 20 },
    });
    s.addShape(pres.shapes.OVAL, {
      x: 7.8, y: 2.5, w: 1.5, h: 1.5, fill: { color: T.teal, transparency: 30 },
    });
    s.addShape(pres.shapes.OVAL, {
      x: 6.5, y: 3.0, w: 1.0, h: 1.0, fill: { color: T.highlight, transparency: 25 },
    });
    s.addText(data.entity_label || "ViHAT", {
      x: 6.3, y: 4.0, w: 3.2, h: 0.4, fontSize: 12, fontFace: F.h,
      color: "FFFFFF", align: "center", margin: 0, bold: true,
    });
  }
}

// ── SLIDE: Executive Summary (3 columns: Problem → Solution → Results) ──
function slideExecSummary(pres, T, title, content, num, total, label) {
  const s = pres.addSlide();
  addHeader(s, pres, T, title);

  // Parse content — expect {problem:[], solution:[], results:[], recommendation:""}
  // Or fallback to plain text
  let problem = [], solution = [], results = [], recommendation = "";

  if (typeof content === "object" && !Array.isArray(content)) {
    problem = content.problem || content.problems || [];
    solution = content.solution || content.solutions || [];
    results = content.results || content.expected_results || [];
    recommendation = content.recommendation || content.summary || "";
  } else if (typeof content === "string") {
    // Fallback: show as text card
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.7, y: 1.1, w: 8.6, h: 3.5, fill: { color: T.bgCard }, shadow: shadow(),
    });
    s.addText(content, {
      x: 1.0, y: 1.3, w: 8.0, h: 3.1, fontSize: 13, fontFace: F.b, color: T.textBody, margin: 0, valign: "top",
    });
    addFooter(s, T, label, num, total);
    return;
  }

  const colW = 2.7, gap = 0.2, startX = 0.7, startY = 1.1;
  const colColors = [T.danger, T.teal, T.success];
  const colHeaders = ["VẤN ĐỀ", "GIẢI PHÁP", "KẾT QUẢ KỲ VỌNG"];
  const colData = [problem, solution, results];

  colData.forEach((items, ci) => {
    const cx = startX + ci * (colW + gap);
    // Column card bg
    s.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: startY, w: colW, h: 3.4, fill: { color: T.bgCard }, shadow: shadow(),
    });
    // Column header badge
    s.addShape(pres.shapes.RECTANGLE, {
      x: cx + 0.15, y: startY + 0.15, w: colW - 0.3, h: 0.4, fill: { color: colColors[ci] },
    });
    s.addText(colHeaders[ci], {
      x: cx + 0.15, y: startY + 0.17, w: colW - 0.3, h: 0.36,
      fontSize: 11, fontFace: F.h, color: T.text, bold: true, align: "center", margin: 0,
    });

    // Items with bullet circles
    (items || []).slice(0, 4).forEach((item, ii) => {
      const iy = startY + 0.7 + ii * 0.65;
      // Checkmark circle
      s.addShape(pres.shapes.OVAL, {
        x: cx + 0.15, y: iy, w: 0.22, h: 0.22, fill: { color: colColors[ci] },
      });
      s.addText("✓", {
        x: cx + 0.15, y: iy - 0.02, w: 0.22, h: 0.24,
        fontSize: 8, fontFace: F.b, color: T.text, align: "center", valign: "middle", margin: 0,
      });
      // Item text
      s.addText(String(item), {
        x: cx + 0.45, y: iy - 0.05, w: colW - 0.65, h: 0.55,
        fontSize: 9, fontFace: F.b, color: T.textBody, margin: 0, valign: "top",
      });
    });

    // Arrows between columns
    if (ci < 2) {
      const ax = cx + colW + 0.02;
      s.addText("→", {
        x: ax, y: startY + 1.5, w: gap - 0.04, h: 0.4,
        fontSize: 18, fontFace: F.b, color: T.highlight, align: "center", margin: 0,
      });
    }
  });

  // Bottom recommendation bar
  if (recommendation) {
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.7, y: 4.65, w: 8.6, h: 0.45, fill: { color: T.highlight },
    });
    s.addText(String(recommendation), {
      x: 0.85, y: 4.67, w: 8.3, h: 0.41,
      fontSize: 10, fontFace: F.h, color: T.text, align: "center", valign: "middle", margin: 0,
    });
  }

  addFooter(s, T, label, num, total);
}

// ── SLIDE: Stats (2x2 pastel cards with icon + big number) ──
function slideStats(pres, T, title, stats, num, total, label) {
  const s = pres.addSlide();
  addHeader(s, pres, T, title);
  const sy = contentY(T);

  const count = Math.min(stats.length, 4);
  const cardW = 4.2, cardH = 1.7, gap = 0.2;
  // Pastel background tints for each card
  const pastels = ["E8F4FD", "FFF3E0", "F3E5F5", "E8F5E9"];
  const accents = [T.primary, T.highlight, "9C27B0", T.success];
  const icons = ["💰", "📈", "❤️", "⚡"];

  stats.slice(0, 4).forEach((stat, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const cx = 0.5 + col * (cardW + gap);
    const cy = sy + row * (cardH + gap);
    const accent = accents[i % accents.length];
    const pastel = T.isLightTheme ? pastels[i % pastels.length] : T.bgCard;

    // Card bg with pastel tint
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: cx, y: cy, w: cardW, h: cardH,
      fill: { color: pastel }, rectRadius: 0.1,
    });
    // Left accent bar
    s.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: cy + 0.1, w: 0.04, h: cardH - 0.2, fill: { color: accent },
    });

    const val = typeof stat === "string" ? stat : (stat.value || "");
    const lbl = typeof stat === "string" ? "" : (stat.label || "");
    const desc = typeof stat === "string" ? "" : (stat.description || "");

    // Icon circle
    s.addShape(pres.shapes.OVAL, {
      x: cx + 0.2, y: cy + 0.2, w: 0.42, h: 0.42, fill: { color: accent }, transparency: 70,
    });

    // Big value next to icon
    s.addText(String(val), {
      x: cx + 0.7, y: cy + 0.1, w: cardW - 1.0, h: 0.5,
      fontSize: 28, fontFace: F.h, color: accent, bold: true, margin: 0, valign: "middle",
    });

    // Label (bold, under value)
    if (lbl) {
      s.addText(String(lbl), {
        x: cx + 0.7, y: cy + 0.55, w: cardW - 1.0, h: 0.3,
        fontSize: 11, fontFace: F.h, color: T.text, bold: true, margin: 0,
      });
    }

    // Description
    if (desc) {
      s.addText(String(desc), {
        x: cx + 0.2, y: cy + 0.9, w: cardW - 0.4, h: 0.7,
        fontSize: 9, fontFace: F.b, color: T.textBody, margin: 0, valign: "top",
      });
    }
  });

  addFooter(s, T, label, num, total);
}

// ── SLIDE: Cards (2x2 with accent bars + impact badges) ──
function slideCards(pres, T, title, cards, num, total, label) {
  const s = pres.addSlide();
  addHeader(s, pres, T, title);
  const sy = contentY(T);

  const cardW = 4.2, cardH = 1.85, gap = 0.2;
  const startX = 0.5;
  const accents = [T.highlight, T.teal, T.success, "9C27B0"];
  const pastelBgs = ["FFF8E1", "E0F7FA", "E8F5E9", "F3E5F5"];

  cards.slice(0, 4).forEach((card, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const cx = startX + col * (cardW + gap);
    const cy = sy + row * (cardH + gap);
    const accent = accents[i % accents.length];
    const pastel = T.isLightTheme ? pastelBgs[i % pastelBgs.length] : T.bgCard;

    const cTitle = typeof card === "string" ? card : (card.title || "");
    const cBody = typeof card === "string" ? "" : (card.body || card.description || "");
    const cImpact = typeof card === "string" ? "" : (card.impact || card.stat || "");
    const cImpactLabel = typeof card === "string" ? "" : (card.impact_label || card.stat_label || "");

    // Card bg with rounded corners
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: cx, y: cy, w: cardW, h: cardH, fill: { color: T.bgCard }, rectRadius: 0.08,
      line: { color: T.isLightTheme ? "E0E0E0" : T.bgCard, width: 0.5 },
    });
    // Colored left border
    s.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: cy + 0.08, w: 0.05, h: cardH - 0.16, fill: { color: accent },
    });

    // Icon circle (subtle)
    s.addShape(pres.shapes.OVAL, {
      x: cx + 0.2, y: cy + 0.15, w: 0.32, h: 0.32, fill: { color: accent }, transparency: 70,
    });

    // Card title (colored)
    s.addText(cTitle, {
      x: cx + 0.6, y: cy + 0.12, w: cardW - 0.8, h: 0.35,
      fontSize: 11, fontFace: F.h, color: accent, bold: true, margin: 0, valign: "middle",
    });

    // Body text
    if (cBody) {
      s.addText(String(cBody), {
        x: cx + 0.2, y: cy + 0.55, w: cardW - 0.4, h: 0.6,
        fontSize: 9, fontFace: F.b, color: T.textBody, margin: 0, valign: "top",
      });
    }

    // Impact stat at bottom of card (compact)
    if (cImpact) {
      const impactText = String(cImpact);
      // Show as a compact colored badge
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: cx + 0.15, y: cy + cardH - 0.42, w: cardW - 0.3, h: 0.3,
        fill: { color: accent }, transparency: 85, rectRadius: 0.04,
      });
      s.addText(impactText, {
        x: cx + 0.2, y: cy + cardH - 0.4, w: cardW - 0.4, h: 0.26,
        fontSize: 9, fontFace: F.h, color: accent, bold: true, margin: 0, valign: "middle",
      });
    }
  });

  addFooter(s, T, label, num, total);
}

// ── SLIDE: Bullets as numbered steps with connecting line ──
function slideBullets(pres, T, title, items, num, total, label) {
  const s = pres.addSlide();
  addHeader(s, pres, T, title);

  // Limit to 6 items, use numbered steps with connecting vertical line
  const maxItems = Math.min(items.length, 6);
  const startX = 1.2, startY = 1.2;
  const rowH = 3.6 / maxItems; // Dynamic height per item
  const accents = [T.highlight, T.primary, T.teal, T.success, T.danger, T.accent];

  // Vertical connecting line
  if (maxItems > 1) {
    s.addShape(pres.shapes.RECTANGLE, {
      x: startX + 0.17, y: startY + 0.35,
      w: 0.04, h: (maxItems - 1) * rowH,
      fill: { color: T.textMuted },
    });
  }

  items.slice(0, maxItems).forEach((item, ii) => {
    const iy = startY + ii * rowH;
    const accent = accents[ii % accents.length];
    let itemTitle, itemDesc;
    if (typeof item === "string") {
      // Auto-split "Title: Description" format
      const colonIdx = item.indexOf(":");
      if (colonIdx > 0 && colonIdx < 40) {
        itemTitle = item.substring(0, colonIdx).trim();
        itemDesc = item.substring(colonIdx + 1).trim();
      } else {
        itemTitle = item;
        itemDesc = "";
      }
    } else {
      itemTitle = item.title || item.text || item.name || String(item);
      itemDesc = item.description || item.body || "";
    }

    // Number circle
    s.addShape(pres.shapes.OVAL, {
      x: startX, y: iy, w: 0.38, h: 0.38, fill: { color: accent },
    });
    s.addText(String(ii + 1), {
      x: startX, y: iy, w: 0.38, h: 0.38,
      fontSize: 14, fontFace: F.h, color: "FFFFFF", align: "center", valign: "middle", margin: 0,
    });

    // Title (bold, compact)
    s.addText(String(itemTitle), {
      x: startX + 0.55, y: iy + 0.02, w: 7.5, h: 0.28,
      fontSize: 12, fontFace: F.h, color: T.text, bold: true, margin: 0, valign: "top",
    });

    // Description (regular weight, smaller)
    if (itemDesc) {
      s.addText(String(itemDesc), {
        x: startX + 0.55, y: iy + 0.28, w: 7.5, h: rowH - 0.35,
        fontSize: 9.5, fontFace: F.b, color: T.textBody, margin: 0, valign: "top",
      });
    }
  });

  addFooter(s, T, label, num, total);
}

// ── SLIDE: Text (paragraph in card) ──
function slideText(pres, T, title, text, num, total, label) {
  const s = pres.addSlide();
  addHeader(s, pres, T, title);
  const sy = contentY(T);

  // Split text into sentences/paragraphs for better readability
  const fullText = String(text);
  const sentences = fullText.split(/(?<=[.!?])\s+/).filter(s => s.trim());

  if (sentences.length <= 2) {
    // Short text: show as highlighted paragraph with left accent bar
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.5, y: sy, w: 9, h: 3.5, fill: { color: T.bgCard }, rectRadius: 0.1,
      line: { color: T.isLightTheme ? "E0E0E0" : T.bgCard, width: 0.5 },
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y: sy + 0.1, w: 0.05, h: 3.3, fill: { color: T.primary },
    });
    s.addText(fullText, {
      x: 0.8, y: sy + 0.2, w: 8.4, h: 3.1,
      fontSize: 12, fontFace: F.b, color: T.textBody, margin: 0, valign: "top",
      lineSpacingMultiple: 1.4,
    });
  } else {
    // Multi-sentence: show as bullet points with icons
    const items = sentences.slice(0, 5);
    const rowH = Math.min(0.7, 3.5 / items.length);
    const accents = [T.primary, T.highlight, T.teal, T.success, "9C27B0"];

    items.forEach((item, i) => {
      const iy = sy + i * rowH;
      const ac = accents[i % accents.length];

      // Bullet circle
      s.addShape(pres.shapes.OVAL, {
        x: 0.6, y: iy + 0.08, w: 0.2, h: 0.2, fill: { color: ac },
      });
      // Text
      s.addText(item.trim(), {
        x: 0.95, y: iy, w: 8.4, h: rowH,
        fontSize: 11, fontFace: F.b, color: T.textBody, margin: 0, valign: "top",
        lineSpacingMultiple: 1.3,
      });
    });
  }

  addFooter(s, T, label, num, total);
}

// ── SLIDE: Table ──
function slideTable(pres, T, title, tableData, num, total, label) {
  const s = pres.addSlide();
  addHeader(s, pres, T, title);

  if (!tableData || !tableData.length) { addFooter(s, T, label, num, total); return; }

  const cols = tableData[0].length;
  const sy = contentY(T);
  const borderColor = T.isLightTheme ? "E0E0E0" : T.bg;
  const altRowFill = T.isLightTheme ? "F8FAFB" : T.bgCard;

  // Detect "recommended" column (look for keywords in header row)
  let highlightCol = -1;
  if (tableData[0]) {
    tableData[0].forEach((cell, ci) => {
      const c = String(cell).toLowerCase();
      if (c.includes("business") || c.includes("khuyến") || c.includes("recommend") || c.includes("pro")) {
        highlightCol = ci;
      }
    });
  }
  const highlightBorder = T.success || "28A745";

  const rows = tableData.map((row, ri) =>
    row.map((cell, ci) => {
      const isHighlightCol = ci === highlightCol && ci > 0;
      const isHeader = ri === 0;
      return {
        text: String(cell),
        options: {
          fontSize: isHeader ? 11 : 9.5,
          fontFace: isHeader ? F.h : F.b,
          color: isHeader ? T.primaryDark : (isHighlightCol ? T.primaryDark : T.textBody),
          bold: isHeader || isHighlightCol,
          fill: { color: isHeader ? T.bgCard : (isHighlightCol ? "F0FFF0" : (ri % 2 === 0 ? altRowFill : T.bgCard)) },
          border: [
            { pt: 0, color: borderColor },
            { pt: isHighlightCol ? 1.5 : 0.5, color: isHighlightCol ? highlightBorder : borderColor },
            { pt: 0.5, color: borderColor },
            { pt: isHighlightCol ? 1.5 : 0.5, color: isHighlightCol ? highlightBorder : borderColor },
          ],
          valign: "middle", margin: [5, 8, 5, 8],
          align: ci === 0 ? "left" : "center",
        },
      };
    })
  );

  // Add "KHUYẾN DÙNG" badge above highlighted column
  if (highlightCol > 0 && cols > 1) {
    const colW = 8.6 / cols;
    const badgeX = 0.5 + highlightCol * colW + colW * 0.15;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: badgeX, y: sy - 0.15, w: colW * 0.7, h: 0.25,
      fill: { color: highlightBorder }, rectRadius: 0.05,
    });
    s.addText("⭐ KHUYẾN DÙNG", {
      x: badgeX, y: sy - 0.14, w: colW * 0.7, h: 0.23,
      fontSize: 7, fontFace: F.h, color: "FFFFFF", align: "center", valign: "middle", margin: 0,
    });
  }

  s.addTable(rows, {
    x: 0.5, y: sy + 0.15, w: 9,
    colW: cols <= 3 ? undefined : Array(cols).fill(9 / cols),
    autoPage: true,
    autoPageRepeatHeader: true,
  });

  addFooter(s, T, label, num, total);
}

// ── SLIDE: Two Column ──
function slideTwoCol(pres, T, title, colData, num, total, label) {
  const s = pres.addSlide();
  addHeader(s, pres, T, title);
  const sy = contentY(T);

  const colW = 4.3, gap = 0.2;
  const accents = [T.primary, T.teal];

  ["left", "right"].forEach((side, ci) => {
    const cx = 0.5 + ci * (colW + gap);

    const colTitle = colData[`${side}_title`] || "";
    const colItems = colData[`${side}_items`] || colData[side] || [];

    // Section title with colored text
    if (colTitle) {
      s.addText(colTitle, {
        x: cx + 0.15, y: sy, w: colW - 0.3, h: 0.35,
        fontSize: 13, fontFace: F.h, color: accents[ci], bold: true, italic: true, margin: 0,
      });
    }

    const itemStartY = colTitle ? sy + 0.45 : sy;
    const maxItems = Math.min(colItems.length, 4);
    const availH = SH - itemStartY - 0.5; // available height
    const itemH = Math.min(0.85, availH / maxItems);

    colItems.slice(0, maxItems).forEach((item, ii) => {
      const iy = itemStartY + ii * itemH;
      const itemText = typeof item === "string" ? item : (item.title || item.name || String(item));
      const itemDesc = typeof item === "object" ? (item.description || item.body || "") : "";

      // Bullet icon
      s.addShape(pres.shapes.OVAL, {
        x: cx + 0.15, y: iy + 0.06, w: 0.18, h: 0.18, fill: { color: accents[ci] },
      });

      if (itemDesc) {
        // Bold title + regular description
        s.addText(itemText, {
          x: cx + 0.42, y: iy, w: colW - 0.6, h: 0.22,
          fontSize: 10, fontFace: F.h, color: T.text, bold: true, margin: 0,
        });
        s.addText(String(itemDesc), {
          x: cx + 0.42, y: iy + 0.22, w: colW - 0.6, h: itemH - 0.28,
          fontSize: 8.5, fontFace: F.b, color: T.textBody, margin: 0, valign: "top",
        });
      } else {
        s.addText(itemText, {
          x: cx + 0.42, y: iy, w: colW - 0.6, h: itemH - 0.05,
          fontSize: 10, fontFace: F.b, color: T.textBody, margin: 0, valign: "top",
        });
      }
    });
  });

  addFooter(s, T, label, num, total);
}

// ── SLIDE: Timeline ──
function slideTimeline(pres, T, title, phases, num, total, label) {
  const s = pres.addSlide();
  addHeader(s, pres, T, title);

  const count = Math.min(phases.length, 5);
  const phW = (8.6 - (count - 1) * 0.15) / count;
  const accents = [T.primary, T.highlight, T.teal, T.success, T.danger];

  // Connector line
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.7, y: 1.95, w: 8.6, h: 0.03, fill: { color: T.textMuted },
  });

  phases.slice(0, 5).forEach((ph, i) => {
    const px = 0.7 + i * (phW + 0.15);
    const ac = accents[i % accents.length];

    // Number circle
    s.addShape(pres.shapes.OVAL, {
      x: px + phW / 2 - 0.2, y: 1.72, w: 0.45, h: 0.45, fill: { color: ac },
    });
    s.addText(String(i + 1), {
      x: px + phW / 2 - 0.2, y: 1.74, w: 0.45, h: 0.42,
      fontSize: 16, fontFace: F.h, color: T.text, align: "center", valign: "middle", bold: true, margin: 0,
    });

    // Phase card
    s.addShape(pres.shapes.RECTANGLE, {
      x: px, y: 2.4, w: phW, h: 2.5, fill: { color: T.bgCard }, shadow: shadow(),
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x: px, y: 2.4, w: phW, h: 0.04, fill: { color: ac },
    });

    const name = typeof ph === "string" ? ph : (ph.name || ph.title || `Phase ${i + 1}`);
    const dur = typeof ph === "string" ? "" : (ph.duration || "");
    const desc = typeof ph === "string" ? "" : (ph.description || "");

    s.addText(name, {
      x: px + 0.08, y: 2.55, w: phW - 0.16, h: 0.35,
      fontSize: 10, fontFace: F.h, color: ac, bold: true, align: "center", margin: 0,
    });
    if (dur) {
      s.addText(String(dur), {
        x: px + 0.08, y: 2.9, w: phW - 0.16, h: 0.2,
        fontSize: 8, fontFace: F.b, color: T.textMuted, align: "center", italic: true, margin: 0,
      });
    }
    if (desc) {
      s.addText(Array.isArray(desc) ? desc.join("\n") : String(desc), {
        x: px + 0.08, y: 3.15, w: phW - 0.16, h: 1.55,
        fontSize: 8, fontFace: F.b, color: T.textBody, valign: "top", margin: 0,
      });
    }
  });

  addFooter(s, T, label, num, total);
}

// ── SLIDE: Feature Grid (2x3 cards with icons + title + description) ──
function slideFeatureGrid(pres, T, title, subtitle, features, num, total, label) {
  const s = pres.addSlide();
  addHeader(s, pres, T, title);
  const baseY = contentY(T);

  // Subtitle
  if (subtitle) {
    s.addText(String(subtitle), {
      x: 0.5, y: baseY - 0.1, w: 9, h: 0.25,
      fontSize: 10, fontFace: F.b, color: T.textMuted, italic: true, margin: 0,
    });
  }

  // Layout: row1 = 3 cards, row2 = 2 cards (or 2+2, or 3+3)
  const count = Math.min(features.length, 6);
  const row1Count = count <= 4 ? 2 : 3;
  const row2Count = count - row1Count;
  const gapX = 0.15, gapY = 0.15;
  const startY = subtitle ? baseY + 0.2 : baseY;
  const accents = [T.primary, T.highlight, T.teal, T.success, "9C27B0", T.primaryDark];
  const pastelTops = ["E3F2FD", "FFF3E0", "E0F2F1", "E8F5E9", "F3E5F5", "ECEFF1"];

  let idx = 0;
  [row1Count, row2Count].forEach((rowCount, rowIdx) => {
    if (rowCount <= 0) return;
    const cardW = (9 - (rowCount - 1) * gapX) / rowCount;
    const cardH = 1.55;
    const rowY = startY + rowIdx * (cardH + gapY);

    for (let ci = 0; ci < rowCount; ci++) {
      const feat = features[idx];
      if (!feat) break;
      const fx = 0.5 + ci * (cardW + gapX);
      const ac = accents[idx % accents.length];
      const pastel = T.isLightTheme ? pastelTops[idx % pastelTops.length] : T.bgCard;

      // Card bg
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x: fx, y: rowY, w: cardW, h: cardH, fill: { color: T.bgCard }, rectRadius: 0.08,
        line: { color: T.isLightTheme ? "E0E0E0" : T.bgCard, width: 0.5 },
      });
      // Colored top border
      s.addShape(pres.shapes.RECTANGLE, {
        x: fx + 0.08, y: rowY, w: cardW - 0.16, h: 0.04, fill: { color: ac },
      });

      // Icon circle
      s.addShape(pres.shapes.OVAL, {
        x: fx + 0.15, y: rowY + 0.15, w: 0.35, h: 0.35, fill: { color: ac }, transparency: 60,
      });

      const fTitle = typeof feat === "string" ? feat : (feat.title || feat.name || "");
      const fDesc = typeof feat === "string" ? "" : (feat.description || feat.body || "");

      // Feature title (colored)
      s.addText(fTitle, {
        x: fx + 0.55, y: rowY + 0.12, w: cardW - 0.7, h: 0.35,
        fontSize: 10, fontFace: F.h, color: ac, bold: true, margin: 0, valign: "middle",
      });
      // Description
      if (fDesc) {
        s.addText(String(fDesc), {
          x: fx + 0.15, y: rowY + 0.55, w: cardW - 0.3, h: 0.9,
          fontSize: 8.5, fontFace: F.b, color: T.textBody, margin: 0, valign: "top",
        });
      }
      idx++;
    }
  });

  // Bottom highlight bar
  const highlight = typeof features === "object" && !Array.isArray(features) ? features.highlight : null;
  if (highlight) {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: 0.5, y: SH - 0.6, w: 9, h: 0.32, fill: { color: T.primary }, rectRadius: 0.05,
    });
    s.addText(String(highlight), {
      x: 0.7, y: SH - 0.58, w: 8.6, h: 0.28,
      fontSize: 9, fontFace: F.b, color: "FFFFFF", align: "center", valign: "middle", margin: 0,
    });
  }

  addFooter(s, T, label, num, total);
}

// ── SLIDE: Steps + Benefits (numbered steps left, benefit cards right) ──
function slideStepsBenefits(pres, T, title, subtitle, data, num, total, label) {
  const s = pres.addSlide();
  addHeader(s, pres, T, title);

  if (subtitle) {
    s.addText(String(subtitle), {
      x: 0.7, y: 1.0, w: 8.6, h: 0.3,
      fontSize: 11, fontFace: F.b, color: T.textMuted, italic: true, margin: 0,
    });
  }

  const steps = data.steps || [];
  const benefits = data.benefits || [];
  const startY = subtitle ? 1.45 : 1.15;
  const colW = 4.15, gap = 0.3;
  const accents = [T.primary, T.highlight, T.teal, T.success];

  // Left column header
  s.addText(data.steps_title || "Cách hoạt động", {
    x: 0.7, y: startY, w: colW, h: 0.3,
    fontSize: 13, fontFace: F.h, color: T.text, margin: 0,
  });

  // Steps with numbered circles
  steps.slice(0, 4).forEach((step, i) => {
    const sy = startY + 0.4 + i * 0.75;
    const ac = accents[i % accents.length];

    // Number circle
    s.addShape(pres.shapes.OVAL, {
      x: 0.7, y: sy, w: 0.42, h: 0.42, fill: { color: ac },
    });
    s.addText(String(i + 1).padStart(2, "0"), {
      x: 0.7, y: sy, w: 0.42, h: 0.42,
      fontSize: 12, fontFace: F.h, color: T.text, align: "center", valign: "middle", bold: true, margin: 0,
    });

    const sTitle = typeof step === "string" ? step : (step.title || step.name || "");
    const sDesc = typeof step === "string" ? "" : (step.description || step.body || "");

    s.addText(sTitle, {
      x: 1.25, y: sy - 0.02, w: colW - 0.65, h: 0.22,
      fontSize: 11, fontFace: F.h, color: T.primary, bold: true, margin: 0,
    });
    if (sDesc) {
      s.addText(String(sDesc), {
        x: 1.25, y: sy + 0.22, w: colW - 0.65, h: 0.4,
        fontSize: 8.5, fontFace: F.b, color: T.textMuted, margin: 0,
      });
    }
  });

  // Right column header
  const rx = 0.7 + colW + gap;
  s.addText(data.benefits_title || "Lợi ích", {
    x: rx, y: startY, w: colW, h: 0.3,
    fontSize: 13, fontFace: F.h, color: T.text, margin: 0,
  });

  // Benefit cards
  benefits.slice(0, 4).forEach((ben, i) => {
    const by = startY + 0.4 + i * 0.75;

    // Benefit card bg
    s.addShape(pres.shapes.RECTANGLE, {
      x: rx, y: by, w: colW, h: 0.65, fill: { color: T.bgCard }, shadow: shadow(),
    });

    // Check circle
    s.addShape(pres.shapes.OVAL, {
      x: rx + 0.1, y: by + 0.08, w: 0.28, h: 0.28, fill: { color: T.success },
    });
    s.addText("✓", {
      x: rx + 0.1, y: by + 0.06, w: 0.28, h: 0.3,
      fontSize: 10, color: T.text, align: "center", valign: "middle", margin: 0,
    });

    const bTitle = typeof ben === "string" ? ben : (ben.title || "");
    const bDesc = typeof ben === "string" ? "" : (ben.description || ben.body || "");

    s.addText(bTitle, {
      x: rx + 0.45, y: by + 0.05, w: colW - 0.6, h: 0.22,
      fontSize: 10, fontFace: F.h, color: T.primary, bold: true, margin: 0,
    });
    if (bDesc) {
      s.addText(String(bDesc), {
        x: rx + 0.45, y: by + 0.28, w: colW - 0.6, h: 0.3,
        fontSize: 8, fontFace: F.b, color: T.textMuted, margin: 0,
      });
    }
  });

  addFooter(s, T, label, num, total);
}

// ── SLIDE: Solution Columns (3 product cards side by side) ──
function slideSolutionColumns(pres, T, title, subtitle, solutions, num, total, label) {
  const s = pres.addSlide();
  s.background = { color: T.bg };

  // Title area (no standard header — full dark bg with title)
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: SW, h: 0.06, fill: { color: T.highlight } });
  s.addText(title.toUpperCase(), {
    x: 0.7, y: 0.3, w: 8.6, h: 0.6,
    fontSize: 26, fontFace: F.h, color: T.text, bold: true, margin: 0,
  });
  if (subtitle) {
    s.addText(String(subtitle), {
      x: 0.7, y: 0.9, w: 8.6, h: 0.3,
      fontSize: 12, fontFace: F.b, color: T.textMuted, italic: true, margin: 0,
    });
  }

  const count = Math.min(solutions.length, 3);
  const colW = (8.6 - (count - 1) * 0.25) / count;
  const startY = 1.35;
  const accents = [T.highlight, T.success, T.teal];

  solutions.slice(0, 3).forEach((sol, i) => {
    const sx = 0.7 + i * (colW + 0.25);
    const ac = accents[i % accents.length];

    // Card bg (slightly lighter than main bg)
    s.addShape(pres.shapes.RECTANGLE, {
      x: sx, y: startY, w: colW, h: 3.65, fill: { color: T.bgCard }, shadow: shadow(),
    });

    // Icon circle at top
    s.addShape(pres.shapes.OVAL, {
      x: sx + colW / 2 - 0.3, y: startY + 0.15, w: 0.6, h: 0.6, fill: { color: ac },
    });
    const icon = typeof sol === "string" ? "●" : (sol.icon || "●");
    s.addText(icon, {
      x: sx + colW / 2 - 0.3, y: startY + 0.15, w: 0.6, h: 0.6,
      fontSize: 18, color: T.text, align: "center", valign: "middle", margin: 0,
    });

    const sName = typeof sol === "string" ? sol : (sol.name || sol.title || "");
    const sSubtitle = typeof sol === "string" ? "" : (sol.subtitle || sol.tagline || "");
    const sItems = typeof sol === "string" ? [] : (sol.items || sol.features || []);

    // Product name
    s.addText(sName, {
      x: sx + 0.1, y: startY + 0.85, w: colW - 0.2, h: 0.5,
      fontSize: 13, fontFace: F.h, color: T.text, align: "center", bold: true, margin: 0,
    });

    // Subtitle/tagline
    if (sSubtitle) {
      s.addText(String(sSubtitle), {
        x: sx + 0.1, y: startY + 1.35, w: colW - 0.2, h: 0.25,
        fontSize: 9, fontFace: F.b, color: ac, italic: true, align: "center", margin: 0,
      });
    }

    // Feature items with checkmarks
    sItems.slice(0, 4).forEach((item, ii) => {
      const iy = startY + 1.7 + ii * 0.45;
      // Check icon
      s.addShape(pres.shapes.OVAL, {
        x: sx + 0.15, y: iy + 0.02, w: 0.2, h: 0.2, fill: { color: T.success },
      });
      s.addText("✓", {
        x: sx + 0.15, y: iy, w: 0.2, h: 0.22,
        fontSize: 7, color: T.text, align: "center", valign: "middle", margin: 0,
      });
      s.addText(String(item), {
        x: sx + 0.42, y: iy - 0.02, w: colW - 0.6, h: 0.38,
        fontSize: 9, fontFace: F.b, color: T.textBody, margin: 0, valign: "top",
      });
    });
  });

  addFooter(s, T, label, num, total);
}

// ── SLIDE: Closing ──
function slideClosing(pres, T, label) {
  const s = pres.addSlide();
  s.background = { color: T.bg };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: SW, h: 0.06, fill: { color: T.primary } });

  s.addText("CẢM ƠN QUÝ KHÁCH", {
    x: 1, y: 0.8, w: 8, h: 0.8,
    fontSize: 32, fontFace: F.h, color: T.text, bold: true, align: "center",
  });
  s.addText("Chúng tôi sẵn sàng đồng hành cùng quý khách!", {
    x: 1, y: 1.6, w: 8, h: 0.4,
    fontSize: 14, fontFace: F.b, color: T.textMuted, italic: true, align: "center",
  });

  // Contact cards with icons
  const contacts = [
    { icon: "📞", label: "Hotline", value: "1900 6181" },
    { icon: "📧", label: "Email", value: "info@vihat.vn" },
    { icon: "🌐", label: "Website", value: "vihat.vn" },
    { icon: "📍", label: "Địa chỉ", value: "140 Đường số 2, Vạn Phúc City, TP.HCM" },
  ];
  const cardW = 2.0, gap = 0.2, totalW = contacts.length * cardW + (contacts.length - 1) * gap;
  const startX = (SW - totalW) / 2;

  contacts.forEach((c, i) => {
    const cx = startX + i * (cardW + gap);
    // Card
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: cx, y: 2.3, w: cardW, h: 1.8, fill: { color: T.bgCard }, rectRadius: 0.08,
      line: { color: T.isLightTheme ? "E0E0E0" : T.bgCard, width: 0.5 },
    });
    // Icon
    s.addText(c.icon, {
      x: cx, y: 2.5, w: cardW, h: 0.5,
      fontSize: 24, align: "center", valign: "middle", margin: 0,
    });
    // Label
    s.addText(c.label, {
      x: cx + 0.1, y: 3.05, w: cardW - 0.2, h: 0.25,
      fontSize: 9, fontFace: F.h, color: T.primary, bold: true, align: "center", margin: 0,
    });
    // Value
    s.addText(c.value, {
      x: cx + 0.1, y: 3.3, w: cardW - 0.2, h: 0.6,
      fontSize: 8, fontFace: F.b, color: T.textBody, align: "center", margin: 0,
    });
  });

  // Company name at bottom
  s.addText(label || "ViHAT Group", {
    x: 2, y: SH - 0.6, w: 6, h: 0.3,
    fontSize: 12, fontFace: F.h, color: T.primary, align: "center", margin: 0,
  });
}

// ── Main ──
async function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  if (!inputPath || !outputPath) { console.error("Usage: node generate_proposal_pptx.js <input.json> <output.pptx>"); process.exit(1); }

  const data = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  const sections = data.sections || [];
  const entityLabel = data.legal_entity_label || "ViHAT Group";
  const entityId = data.legal_entity_id || "default";

  // IMPORTANT: Reset fonts to defaults at the start of each run.
  // Without this, if the process is reused (e.g., template-based call sets
  // Be Vietnam Pro, then design call in the same process inherits those fonts).
  F = { h: "Arial Black", b: "Arial" };

  // Load custom themes from data/themes.json (extracted from uploaded templates)
  let customThemes = {};
  const themesPath = path.join(__dirname, "..", "data", "themes.json");
  try {
    if (fs.existsSync(themesPath)) {
      customThemes = JSON.parse(fs.readFileSync(themesPath, "utf-8"));
    }
  } catch (e) { /* ignore */ }

  // Merge: custom theme overrides built-in theme
  const baseTheme = THEMES[entityId] || THEMES.default;
  const customTheme = customThemes[entityId] || {};
  const T = { ...baseTheme, ...customTheme };

  // Apply font override from template extraction (if provided)
  if (data.font_override) {
    if (data.font_override.h) F = { ...F, h: data.font_override.h };
    if (data.font_override.b) F = { ...F, b: data.font_override.b };
    console.log(`Font override: h="${F.h}", b="${F.b}"`);
  }

  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = entityLabel;
  pres.title = `Proposal cho ${data.customer_name || ""}`;

  // Count slides
  let totalSlides = 2;
  sections.forEach((sec) => {
    if (sec.type === "cover") return;
    if (sec.type === "bullets" && Array.isArray(sec.content) && sec.content.length > 12) {
      totalSlides += Math.ceil(sec.content.length / 12);
    } else {
      totalSlides++;
    }
  });

  // Cover
  const cover = sections.find((s) => s.type === "cover") || {};
  slideCover(pres, T, {
    title: cover.title || data.cover_title || "GIẢI PHÁP",
    subtitle: cover.subtitle || data.cover_subtitle || "",
    customer: cover.customer || data.customer_name || "",
    entity_label: entityLabel,
    customer_logo: data.customer_logo || "",
    vihat_logo: data.vihat_logo || "",
  });

  // Content
  let sn = 2;
  sections.forEach((sec) => {
    if (sec.type === "cover") return;
    const title = sec.heading || sec.title || "";
    const content = sec.content;

    if (sec.type === "exec_summary") {
      slideExecSummary(pres, T, title, content, sn++, totalSlides, entityLabel);
    } else if (sec.type === "stats" && Array.isArray(content)) {
      slideStats(pres, T, title, content, sn++, totalSlides, entityLabel);
    } else if (sec.type === "cards" && Array.isArray(content)) {
      slideCards(pres, T, title, content, sn++, totalSlides, entityLabel);
    } else if (sec.type === "table" && Array.isArray(content)) {
      const header = content[0] || [];
      const rows = content.slice(1);
      for (let i = 0; i < Math.max(rows.length, 1); i += 8) {
        slideTable(pres, T, i === 0 ? title : `${title} (tiếp)`, [header, ...rows.slice(i, i + 8)], sn++, totalSlides, entityLabel);
      }
    } else if (sec.type === "two_column" && typeof content === "object" && !Array.isArray(content)) {
      slideTwoCol(pres, T, title, content, sn++, totalSlides, entityLabel);
    } else if (sec.type === "timeline" && Array.isArray(content)) {
      slideTimeline(pres, T, title, content, sn++, totalSlides, entityLabel);
    } else if (sec.type === "feature_grid") {
      const items = Array.isArray(content) ? content : (content.features || content.items || []);
      slideFeatureGrid(pres, T, title, sec.subtitle || "", items, sn++, totalSlides, entityLabel);
    } else if (sec.type === "steps_benefits" && typeof content === "object") {
      slideStepsBenefits(pres, T, title, sec.subtitle || "", content, sn++, totalSlides, entityLabel);
    } else if (sec.type === "solution_columns") {
      const items = Array.isArray(content) ? content : (content.solutions || []);
      slideSolutionColumns(pres, T, title, sec.subtitle || "", items, sn++, totalSlides, entityLabel);
    } else if (sec.type === "text" && typeof content === "string") {
      slideText(pres, T, title, content, sn++, totalSlides, entityLabel);
    } else if (sec.type === "bullets" && Array.isArray(content)) {
      for (let i = 0; i < content.length; i += 12) {
        slideBullets(pres, T, i === 0 ? title : `${title} (tiếp)`, content.slice(i, i + 12), sn++, totalSlides, entityLabel);
      }
    } else {
      if (Array.isArray(content)) {
        slideBullets(pres, T, title, content.map(String), sn++, totalSlides, entityLabel);
      } else if (typeof content === "string") {
        slideText(pres, T, title, content, sn++, totalSlides, entityLabel);
      } else {
        sn++;
      }
    }
  });

  slideClosing(pres, T, entityLabel);

  await pres.writeFile({ fileName: outputPath });
  console.log(`PPTX created: ${outputPath} (${sn} slides)`);
}

main().catch((err) => { console.error("Error:", err.message); process.exit(1); });
