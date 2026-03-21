#!/usr/bin/env node
/**
 * Generate professional proposal PPTX using pptxgenjs
 * Usage: node generate_proposal_pptx.js <input.json> <output.pptx>
 *
 * Input JSON structure: { sections: [...], customer_name, legal_entity_label }
 */
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

// ── Design System (ViHAT Brand) ──
const C = {
  navyDark: "0D2F4F",
  navy: "1B4F72",
  navyLight: "2C6FA0",
  orange: "E67E22",
  orangeLight: "F5D5A0",
  teal: "17A2B8",
  green: "28A745",
  red: "E74C3C",
  textDark: "1A1A2E",
  textBody: "4A4A5A",
  textMuted: "6C757D",
  textLight: "AEB6BF",
  white: "FFFFFF",
  offWhite: "F8F9FA",
  lightGray: "E9ECEF",
  cardBg: "FFFFFF",
  bgLight: "F0F4F8",
};

const FONT = { heading: "Arial Black", body: "Arial" };
const SW = 10; // slide width
const SH = 5.625; // slide height

// ── Helpers ──
const shadow = () => ({
  type: "outer", blur: 6, offset: 2, angle: 135,
  color: "000000", opacity: 0.12,
});

function footer(slide, entityLabel, slideNum, totalSlides) {
  slide.addText(`${entityLabel}  |  Confidential`, {
    x: 0.5, y: SH - 0.4, w: 5, h: 0.3,
    fontSize: 8, fontFace: FONT.body, color: C.textMuted,
  });
  slide.addText(`${slideNum} / ${totalSlides}`, {
    x: SW - 1.5, y: SH - 0.4, w: 1, h: 0.3,
    fontSize: 8, fontFace: FONT.body, color: C.textMuted, align: "right",
  });
}

// ── Slide Builders ──

function slideCover(pres, data) {
  const slide = pres.addSlide();
  slide.background = { color: C.navyDark };

  // Decorative accent bar at top
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: SW, h: 0.06, fill: { color: C.orange },
  });

  // Main title
  slide.addText(data.title || "GIẢI PHÁP", {
    x: 0.8, y: 1.0, w: 8.4, h: 1.0,
    fontSize: 40, fontFace: FONT.heading, color: C.white, bold: true,
  });

  // Subtitle
  slide.addText(data.subtitle || "", {
    x: 0.8, y: 2.0, w: 8.4, h: 0.8,
    fontSize: 22, fontFace: FONT.body, color: C.orange,
  });

  // Customer name
  slide.addText(data.customer || "", {
    x: 0.8, y: 2.8, w: 8.4, h: 0.6,
    fontSize: 18, fontFace: FONT.body, color: C.textLight,
  });

  // Bottom bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: SH - 0.5, w: SW, h: 0.5, fill: { color: C.navy },
  });
  slide.addText(data.entity_label || "ViHAT Group", {
    x: 0.8, y: SH - 0.45, w: 5, h: 0.4,
    fontSize: 10, fontFace: FONT.body, color: C.textLight,
  });
  slide.addText(data.date || new Date().toLocaleDateString("vi-VN"), {
    x: SW - 3, y: SH - 0.45, w: 2.2, h: 0.4,
    fontSize: 10, fontFace: FONT.body, color: C.textLight, align: "right",
  });
}

function slideSectionHeader(pres, title, slideNum, total, entityLabel) {
  const slide = pres.addSlide();
  slide.background = { color: C.navyDark };
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: SW, h: 0.06, fill: { color: C.orange },
  });
  slide.addText(title.toUpperCase(), {
    x: 1, y: 1.8, w: 8, h: 1.5,
    fontSize: 36, fontFace: FONT.heading, color: C.white, bold: true,
  });
  footer(slide, entityLabel, slideNum, total);
}

function slideBullets(pres, title, items, slideNum, total, entityLabel) {
  const slide = pres.addSlide();
  slide.background = { color: C.offWhite };

  // Header bar
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: SW, h: 0.9, fill: { color: C.navyDark },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0.9, w: SW, h: 0.04, fill: { color: C.orange },
  });
  slide.addText(title.toUpperCase(), {
    x: 0.8, y: 0.15, w: 8.4, h: 0.6,
    fontSize: 22, fontFace: FONT.heading, color: C.white, bold: true, margin: 0,
  });

  // Bullets as text
  const bulletItems = items.map((item, i) => ({
    text: String(item),
    options: { bullet: true, breakLine: i < items.length - 1, indentLevel: 0 },
  }));

  slide.addText(bulletItems, {
    x: 0.8, y: 1.2, w: 8.4, h: 3.8,
    fontSize: 14, fontFace: FONT.body, color: C.textDark,
    paraSpaceAfter: 8, valign: "top",
  });

  footer(slide, entityLabel, slideNum, total);
}

function slideCards(pres, title, cards, slideNum, total, entityLabel) {
  const slide = pres.addSlide();
  slide.background = { color: C.offWhite };

  // Header
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: SW, h: 0.9, fill: { color: C.navyDark },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0.9, w: SW, h: 0.04, fill: { color: C.orange },
  });
  slide.addText(title.toUpperCase(), {
    x: 0.8, y: 0.15, w: 8.4, h: 0.6,
    fontSize: 22, fontFace: FONT.heading, color: C.white, bold: true, margin: 0,
  });

  // Cards layout (2x2 grid)
  const cardW = 4.0;
  const cardH = 1.85;
  const gap = 0.3;
  const startX = (SW - 2 * cardW - gap) / 2;
  const startY = 1.15;
  const accentColors = [C.orange, C.teal, C.green, C.red];

  cards.slice(0, 4).forEach((card, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = startX + col * (cardW + gap);
    const cy = startY + row * (cardH + gap);
    const accent = accentColors[i % accentColors.length];

    // Card background
    slide.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: cy, w: cardW, h: cardH,
      fill: { color: C.cardBg }, shadow: shadow(),
    });
    // Left accent bar
    slide.addShape(pres.shapes.RECTANGLE, {
      x: cx, y: cy, w: 0.06, h: cardH,
      fill: { color: accent },
    });

    // Card title
    const cardTitle = typeof card === "string" ? card : (card.title || card.heading || "");
    const cardBody = typeof card === "string" ? "" : (card.body || card.description || card.content || "");
    const cardImpact = typeof card === "string" ? "" : (card.impact || card.stat || "");

    slide.addText(cardTitle, {
      x: cx + 0.25, y: cy + 0.15, w: cardW - 0.4, h: 0.45,
      fontSize: 13, fontFace: FONT.heading, color: C.navy, bold: true,
      valign: "top", margin: 0,
    });

    if (cardBody) {
      slide.addText(String(cardBody), {
        x: cx + 0.25, y: cy + 0.6, w: cardW - 0.4, h: 0.7,
        fontSize: 10, fontFace: FONT.body, color: C.textMuted,
        valign: "top", margin: 0,
      });
    }

    if (cardImpact) {
      // Impact badge
      slide.addShape(pres.shapes.RECTANGLE, {
        x: cx + 0.2, y: cy + cardH - 0.4, w: cardW - 0.4, h: 0.28,
        fill: { color: "FDE8E8" },
      });
      slide.addText(String(cardImpact), {
        x: cx + 0.25, y: cy + cardH - 0.38, w: cardW - 0.5, h: 0.24,
        fontSize: 9, fontFace: FONT.body, color: C.red, bold: true, margin: 0,
      });
    }
  });

  footer(slide, entityLabel, slideNum, total);
}

function slideStats(pres, title, stats, slideNum, total, entityLabel) {
  const slide = pres.addSlide();
  slide.background = { color: C.offWhite };

  // Header
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: SW, h: 0.9, fill: { color: C.navyDark },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0.9, w: SW, h: 0.04, fill: { color: C.orange },
  });
  slide.addText(title.toUpperCase(), {
    x: 0.8, y: 0.15, w: 8.4, h: 0.6,
    fontSize: 22, fontFace: FONT.heading, color: C.white, bold: true, margin: 0,
  });

  // Stats in a row
  const count = Math.min(stats.length, 4);
  const statW = (SW - 1.6 - (count - 1) * 0.3) / count;
  const accentColors = [C.navy, C.orange, C.teal, C.green];

  stats.slice(0, 4).forEach((stat, i) => {
    const sx = 0.8 + i * (statW + 0.3);
    const color = accentColors[i % accentColors.length];

    // Stat card
    slide.addShape(pres.shapes.RECTANGLE, {
      x: sx, y: 1.2, w: statW, h: 2.0,
      fill: { color: C.cardBg }, shadow: shadow(),
    });

    const statValue = typeof stat === "string" ? stat : (stat.value || stat.number || "");
    const statLabel = typeof stat === "string" ? "" : (stat.label || stat.title || "");
    const statDesc = typeof stat === "string" ? "" : (stat.description || "");

    // Big number
    slide.addText(String(statValue), {
      x: sx, y: 1.35, w: statW, h: 0.8,
      fontSize: 36, fontFace: FONT.heading, color: color,
      align: "center", bold: true, margin: 0,
    });
    // Label
    if (statLabel) {
      slide.addText(String(statLabel), {
        x: sx + 0.15, y: 2.15, w: statW - 0.3, h: 0.35,
        fontSize: 11, fontFace: FONT.body, color: C.textDark,
        align: "center", bold: true, margin: 0,
      });
    }
    // Description
    if (statDesc) {
      slide.addText(String(statDesc), {
        x: sx + 0.15, y: 2.5, w: statW - 0.3, h: 0.5,
        fontSize: 9, fontFace: FONT.body, color: C.textMuted,
        align: "center", margin: 0,
      });
    }
  });

  footer(slide, entityLabel, slideNum, total);
}

function slideTable(pres, title, tableData, slideNum, total, entityLabel) {
  const slide = pres.addSlide();
  slide.background = { color: C.offWhite };

  // Header
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: SW, h: 0.9, fill: { color: C.navyDark },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0.9, w: SW, h: 0.04, fill: { color: C.orange },
  });
  slide.addText(title.toUpperCase(), {
    x: 0.8, y: 0.15, w: 8.4, h: 0.6,
    fontSize: 22, fontFace: FONT.heading, color: C.white, bold: true, margin: 0,
  });

  if (!tableData || tableData.length === 0) {
    footer(slide, entityLabel, slideNum, total);
    return;
  }

  const rows = tableData.map((row, ri) => {
    return row.map((cell) => ({
      text: String(cell),
      options: {
        fontSize: ri === 0 ? 11 : 10,
        fontFace: FONT.body,
        color: ri === 0 ? C.white : C.textDark,
        bold: ri === 0,
        fill: { color: ri === 0 ? C.navy : (ri % 2 === 0 ? C.lightGray : C.white) },
        border: { pt: 0.5, color: C.lightGray },
        valign: "middle",
        margin: [4, 6, 4, 6],
      },
    }));
  });

  const cols = tableData[0] ? tableData[0].length : 2;
  const colW = Array(cols).fill((SW - 1.6) / cols);

  slide.addTable(rows, {
    x: 0.8, y: 1.15, w: SW - 1.6,
    colW: colW,
    border: { pt: 0, color: C.lightGray },
  });

  footer(slide, entityLabel, slideNum, total);
}

function slideTwoColumn(pres, title, colData, slideNum, total, entityLabel) {
  const slide = pres.addSlide();
  slide.background = { color: C.offWhite };

  // Header
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: SW, h: 0.9, fill: { color: C.navyDark },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0.9, w: SW, h: 0.04, fill: { color: C.orange },
  });
  slide.addText(title.toUpperCase(), {
    x: 0.8, y: 0.15, w: 8.4, h: 0.6,
    fontSize: 22, fontFace: FONT.heading, color: C.white, bold: true, margin: 0,
  });

  const colW = 4.0;
  const gap = 0.4;
  const startX = (SW - 2 * colW - gap) / 2;

  // Left column card
  slide.addShape(pres.shapes.RECTANGLE, {
    x: startX, y: 1.15, w: colW, h: 3.8,
    fill: { color: C.cardBg }, shadow: shadow(),
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: startX, y: 1.15, w: colW, h: 0.06, fill: { color: C.orange },
  });

  const leftTitle = colData.left_title || "";
  const leftItems = colData.left_items || [];

  slide.addText(leftTitle, {
    x: startX + 0.25, y: 1.35, w: colW - 0.5, h: 0.4,
    fontSize: 14, fontFace: FONT.heading, color: C.navy, bold: true, margin: 0,
  });

  if (leftItems.length > 0) {
    const leftBullets = leftItems.map((item, i) => ({
      text: String(item),
      options: { bullet: true, breakLine: i < leftItems.length - 1 },
    }));
    slide.addText(leftBullets, {
      x: startX + 0.25, y: 1.85, w: colW - 0.5, h: 2.9,
      fontSize: 11, fontFace: FONT.body, color: C.textBody, paraSpaceAfter: 6, margin: 0,
    });
  }

  // Right column card
  const rx = startX + colW + gap;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: rx, y: 1.15, w: colW, h: 3.8,
    fill: { color: C.cardBg }, shadow: shadow(),
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: rx, y: 1.15, w: colW, h: 0.06, fill: { color: C.teal },
  });

  const rightTitle = colData.right_title || "";
  const rightItems = colData.right_items || [];

  slide.addText(rightTitle, {
    x: rx + 0.25, y: 1.35, w: colW - 0.5, h: 0.4,
    fontSize: 14, fontFace: FONT.heading, color: C.navy, bold: true, margin: 0,
  });

  if (rightItems.length > 0) {
    const rightBullets = rightItems.map((item, i) => ({
      text: String(item),
      options: { bullet: true, breakLine: i < rightItems.length - 1 },
    }));
    slide.addText(rightBullets, {
      x: rx + 0.25, y: 1.85, w: colW - 0.5, h: 2.9,
      fontSize: 11, fontFace: FONT.body, color: C.textBody, paraSpaceAfter: 6, margin: 0,
    });
  }

  footer(slide, entityLabel, slideNum, total);
}

function slideText(pres, title, text, slideNum, total, entityLabel) {
  const slide = pres.addSlide();
  slide.background = { color: C.offWhite };

  // Header
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: SW, h: 0.9, fill: { color: C.navyDark },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0.9, w: SW, h: 0.04, fill: { color: C.orange },
  });
  slide.addText(title.toUpperCase(), {
    x: 0.8, y: 0.15, w: 8.4, h: 0.6,
    fontSize: 22, fontFace: FONT.heading, color: C.white, bold: true, margin: 0,
  });

  // Content card
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.8, y: 1.15, w: 8.4, h: 3.8,
    fill: { color: C.cardBg }, shadow: shadow(),
  });

  slide.addText(String(text), {
    x: 1.1, y: 1.35, w: 7.8, h: 3.4,
    fontSize: 13, fontFace: FONT.body, color: C.textBody,
    valign: "top", paraSpaceAfter: 8, margin: 0,
  });

  footer(slide, entityLabel, slideNum, total);
}

function slideTimeline(pres, title, phases, slideNum, total, entityLabel) {
  const slide = pres.addSlide();
  slide.background = { color: C.offWhite };

  // Header
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: SW, h: 0.9, fill: { color: C.navyDark },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0.9, w: SW, h: 0.04, fill: { color: C.orange },
  });
  slide.addText(title.toUpperCase(), {
    x: 0.8, y: 0.15, w: 8.4, h: 0.6,
    fontSize: 22, fontFace: FONT.heading, color: C.white, bold: true, margin: 0,
  });

  const count = Math.min(phases.length, 5);
  const phaseW = (SW - 1.6 - (count - 1) * 0.15) / count;
  const accentColors = [C.navy, C.orange, C.teal, C.green, C.red];

  // Timeline connector line
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.8, y: 2.0, w: SW - 1.6, h: 0.04, fill: { color: C.lightGray },
  });

  phases.slice(0, 5).forEach((phase, i) => {
    const px = 0.8 + i * (phaseW + 0.15);
    const color = accentColors[i % accentColors.length];

    // Circle number
    slide.addShape(pres.shapes.OVAL, {
      x: px + phaseW / 2 - 0.2, y: 1.75, w: 0.5, h: 0.5,
      fill: { color: color },
    });
    slide.addText(String(i + 1), {
      x: px + phaseW / 2 - 0.2, y: 1.78, w: 0.5, h: 0.45,
      fontSize: 16, fontFace: FONT.heading, color: C.white,
      align: "center", valign: "middle", bold: true, margin: 0,
    });

    // Phase card
    slide.addShape(pres.shapes.RECTANGLE, {
      x: px, y: 2.5, w: phaseW, h: 2.3,
      fill: { color: C.cardBg }, shadow: shadow(),
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x: px, y: 2.5, w: phaseW, h: 0.05, fill: { color: color },
    });

    const phaseName = typeof phase === "string" ? phase : (phase.name || phase.title || `Phase ${i + 1}`);
    const phaseDesc = typeof phase === "string" ? "" : (phase.description || phase.tasks || phase.content || "");
    const phaseDuration = typeof phase === "string" ? "" : (phase.duration || phase.time || "");

    slide.addText(phaseName, {
      x: px + 0.1, y: 2.65, w: phaseW - 0.2, h: 0.4,
      fontSize: 10, fontFace: FONT.heading, color: color, bold: true,
      align: "center", margin: 0,
    });

    if (phaseDuration) {
      slide.addText(String(phaseDuration), {
        x: px + 0.1, y: 3.0, w: phaseW - 0.2, h: 0.25,
        fontSize: 8, fontFace: FONT.body, color: C.textMuted,
        align: "center", italic: true, margin: 0,
      });
    }

    if (phaseDesc) {
      const descText = Array.isArray(phaseDesc) ? phaseDesc.join("\n") : String(phaseDesc);
      slide.addText(descText, {
        x: px + 0.1, y: 3.3, w: phaseW - 0.2, h: 1.3,
        fontSize: 8, fontFace: FONT.body, color: C.textBody,
        valign: "top", margin: 0,
      });
    }
  });

  footer(slide, entityLabel, slideNum, total);
}

function slideClosing(pres, entityLabel) {
  const slide = pres.addSlide();
  slide.background = { color: C.navyDark };
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: SW, h: 0.06, fill: { color: C.orange },
  });

  slide.addText("CẢM ƠN QUÝ KHÁCH", {
    x: 1, y: 1.2, w: 8, h: 1.0,
    fontSize: 36, fontFace: FONT.heading, color: C.white, bold: true,
    align: "center",
  });

  slide.addText([
    { text: entityLabel || "ViHAT Group", options: { bold: true, breakLine: true, fontSize: 16 } },
    { text: "Website: vihat.vn  |  Hotline: 1900 6181", options: { breakLine: true, fontSize: 13 } },
    { text: "Email: info@vihat.vn", options: { fontSize: 13 } },
  ], {
    x: 1, y: 2.5, w: 8, h: 1.5,
    fontFace: FONT.body, color: C.textLight, align: "center",
  });
}

// ── Main ──

async function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!inputPath || !outputPath) {
    console.error("Usage: node generate_proposal_pptx.js <input.json> <output.pptx>");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  const sections = data.sections || [];
  const entityLabel = data.legal_entity_label || "ViHAT Group";
  const customerName = data.customer_name || "";

  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author = entityLabel;
  pres.title = `Proposal cho ${customerName}`;

  // Count total slides for footer
  let totalSlides = 2; // cover + closing
  sections.forEach((sec) => {
    const type = sec.type || "bullets";
    const content = sec.content;
    if (type === "bullets" && Array.isArray(content)) {
      totalSlides += Math.ceil(content.length / 8);
    } else {
      totalSlides += 1;
    }
  });

  // 1. Cover slide
  const coverData = sections.find((s) => (s.type === "cover")) || {};
  slideCover(pres, {
    title: coverData.title || data.cover_title || "GIẢI PHÁP",
    subtitle: coverData.subtitle || data.cover_subtitle || "",
    customer: coverData.customer || customerName,
    entity_label: entityLabel,
    date: new Date().toLocaleDateString("vi-VN"),
  });

  // 2. Content slides
  let slideNum = 2;
  sections.forEach((sec) => {
    if (sec.type === "cover") return; // already handled

    const title = sec.heading || sec.title || "";
    const type = sec.type || "bullets";
    const content = sec.content;

    if (type === "section_header") {
      slideSectionHeader(pres, title, slideNum, totalSlides, entityLabel);
      slideNum++;
    } else if (type === "cards" && Array.isArray(content)) {
      slideCards(pres, title, content, slideNum, totalSlides, entityLabel);
      slideNum++;
    } else if (type === "stats" && Array.isArray(content)) {
      slideStats(pres, title, content, slideNum, totalSlides, entityLabel);
      slideNum++;
    } else if (type === "table" && Array.isArray(content)) {
      // Split large tables
      const header = content[0] || [];
      const rows = content.slice(1);
      for (let i = 0; i < Math.max(rows.length, 1); i += 8) {
        const chunk = [header, ...rows.slice(i, i + 8)];
        const pageTitle = i === 0 ? title : `${title} (tiếp)`;
        slideTable(pres, pageTitle, chunk, slideNum, totalSlides, entityLabel);
        slideNum++;
      }
    } else if (type === "two_column" && typeof content === "object" && !Array.isArray(content)) {
      slideTwoColumn(pres, title, content, slideNum, totalSlides, entityLabel);
      slideNum++;
    } else if (type === "timeline" && Array.isArray(content)) {
      slideTimeline(pres, title, content, slideNum, totalSlides, entityLabel);
      slideNum++;
    } else if (type === "text" && typeof content === "string") {
      slideText(pres, title, content, slideNum, totalSlides, entityLabel);
      slideNum++;
    } else if (type === "bullets" && Array.isArray(content)) {
      // Split into pages of 8
      for (let i = 0; i < content.length; i += 8) {
        const chunk = content.slice(i, i + 8);
        const pageTitle = i === 0 ? title : `${title} (tiếp)`;
        slideBullets(pres, pageTitle, chunk, slideNum, totalSlides, entityLabel);
        slideNum++;
      }
    } else {
      // Fallback: bullets or text
      if (Array.isArray(content)) {
        slideBullets(pres, title, content.map(String), slideNum, totalSlides, entityLabel);
      } else if (typeof content === "string") {
        slideText(pres, title, content, slideNum, totalSlides, entityLabel);
      }
      slideNum++;
    }
  });

  // 3. Closing slide
  slideClosing(pres, entityLabel);

  // Write file
  await pres.writeFile({ fileName: outputPath });
  console.log(`PPTX created: ${outputPath} (${slideNum} slides)`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
