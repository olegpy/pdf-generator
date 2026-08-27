import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import type { Counterparty, InvoiceLineInput, Issuer } from "../schema";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const ink = rgb(0.09, 0.09, 0.11);
const muted = rgb(0.42, 0.44, 0.47);
const rule = rgb(0.88, 0.89, 0.91);
const accent = rgb(0.13, 0.13, 0.15);

function loadFont(filename: string) {
  return readFileSync(join(process.cwd(), "lib/invoice/pdf/fonts", filename));
}

function wrapText(font: PDFFont, text: string, size: number, maxWidth: number) {
  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(" ").filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let current = words[0];
    for (const word of words.slice(1)) {
      const next = `${current} ${word}`;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        current = next;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }

  return lines;
}

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export async function renderInvoicePdf(input: {
  number: string;
  issuedAt: Date;
  issuer: Issuer;
  counterparty: Counterparty;
  lines: InvoiceLineInput[];
  currency: string;
  notes?: string;
}) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(loadFont("NotoSans-Regular.ttf"), {
    subset: true,
  });
  const bold = await pdf.embedFont(loadFont("NotoSans-Bold.ttf"), {
    subset: true,
  });
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  let y = PAGE_HEIGHT - MARGIN;
  page.drawText("INVOICE", {
    x: MARGIN,
    y,
    size: 22,
    font: bold,
    color: accent,
  });

  const numberWidth = bold.widthOfTextAtSize(input.number, 12);
  page.drawText(input.number, {
    x: PAGE_WIDTH - MARGIN - numberWidth,
    y: y + 6,
    size: 12,
    font: bold,
    color: ink,
  });

  y -= 18;
  const issued = input.issuedAt.toISOString().slice(0, 10);
  const issuedLabel = `Issued ${issued}`;
  const issuedWidth = regular.widthOfTextAtSize(issuedLabel, 9);
  page.drawText(issuedLabel, {
    x: PAGE_WIDTH - MARGIN - issuedWidth,
    y,
    size: 9,
    font: regular,
    color: muted,
  });

  y -= 16;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: rule,
  });

  y -= 28;
  page.drawText("From", {
    x: MARGIN,
    y,
    size: 8,
    font: bold,
    color: muted,
  });
  page.drawText("Bill to", {
    x: PAGE_WIDTH / 2,
    y,
    size: 8,
    font: bold,
    color: muted,
  });

  y -= 16;
  const fromLines = [
    input.issuer.name,
    ...input.issuer.address.split("\n"),
    input.issuer.email,
    `Tax ID ${input.issuer.taxId}`,
  ];
  const toLines = [
    input.counterparty.name,
    ...(input.counterparty.address?.split("\n") ?? []),
    input.counterparty.email,
  ].filter((line): line is string => Boolean(line));

  const blockStart = y;
  fromLines.forEach((line, index) => {
    page.drawText(line, {
      x: MARGIN,
      y: blockStart - index * 14,
      size: index === 0 ? 11 : 9,
      font: index === 0 ? bold : regular,
      color: ink,
    });
  });
  toLines.forEach((line, index) => {
    page.drawText(line, {
      x: PAGE_WIDTH / 2,
      y: blockStart - index * 14,
      size: index === 0 ? 11 : 9,
      font: index === 0 ? bold : regular,
      color: ink,
    });
  });

  y = blockStart - Math.max(fromLines.length, toLines.length) * 14 - 28;

  const cols = {
    description: MARGIN,
    qty: MARGIN + CONTENT_WIDTH - 210,
    price: MARGIN + CONTENT_WIDTH - 140,
    amount: MARGIN + CONTENT_WIDTH,
  };

  page.drawText("Description", {
    x: cols.description,
    y,
    size: 8,
    font: bold,
    color: muted,
  });
  page.drawText("Qty", {
    x: cols.qty,
    y,
    size: 8,
    font: bold,
    color: muted,
  });
  page.drawText("Price", {
    x: cols.price,
    y,
    size: 8,
    font: bold,
    color: muted,
  });
  const amountHeader = "Amount";
  page.drawText(amountHeader, {
    x: cols.amount - bold.widthOfTextAtSize(amountHeader, 8),
    y,
    size: 8,
    font: bold,
    color: muted,
  });

  y -= 10;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.75,
    color: rule,
  });
  y -= 16;

  let subtotal = 0;
  for (const line of input.lines) {
    const amount = line.quantity * line.unitPrice;
    subtotal += amount;
    const descriptionLines = wrapText(
      regular,
      line.description,
      10,
      cols.qty - cols.description - 16,
    );
    const rowHeight = Math.max(16, descriptionLines.length * 13);

    descriptionLines.forEach((text, index) => {
      page.drawText(text, {
        x: cols.description,
        y: y - index * 13,
        size: 10,
        font: regular,
        color: ink,
      });
    });

    const qty = String(line.quantity);
    page.drawText(qty, {
      x: cols.qty,
      y,
      size: 10,
      font: regular,
      color: ink,
    });

    const price = money(line.unitPrice, input.currency);
    page.drawText(price, {
      x: cols.price,
      y,
      size: 10,
      font: regular,
      color: ink,
    });

    const amountText = money(amount, input.currency);
    page.drawText(amountText, {
      x: cols.amount - regular.widthOfTextAtSize(amountText, 10),
      y,
      size: 10,
      font: regular,
      color: ink,
    });

    y -= rowHeight + 6;
  }

  y -= 6;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.75,
    color: rule,
  });
  y -= 22;

  page.drawText("Total", {
    x: cols.price,
    y,
    size: 12,
    font: bold,
    color: ink,
  });
  const totalText = money(subtotal, input.currency);
  page.drawText(totalText, {
    x: cols.amount - bold.widthOfTextAtSize(totalText, 12),
    y,
    size: 12,
    font: bold,
    color: ink,
  });

  if (input.notes) {
    y -= 36;
    page.drawText("Notes", {
      x: MARGIN,
      y,
      size: 8,
      font: bold,
      color: muted,
    });
    y -= 14;
    for (const noteLine of wrapText(regular, input.notes, 9, CONTENT_WIDTH)) {
      page.drawText(noteLine, {
        x: MARGIN,
        y,
        size: 9,
        font: regular,
        color: ink,
      });
      y -= 13;
    }
  }

  const bytes = await pdf.save();
  return { pdf: bytes, subtotal };
}

export function nextInvoiceNumber(issuedAt: Date) {
  const stamp = issuedAt.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.randomUUID().slice(0, 4).toUpperCase();
  return `INV-${stamp}-${suffix}`;
}
