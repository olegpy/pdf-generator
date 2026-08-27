import { PDFDocument, PDFPage } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import { demoIssuer, exampleLines } from "../demo";
import { nextInvoiceNumber, renderInvoicePdf } from "./render";

const issuedAt = new Date();
const issuedDate = issuedAt.toISOString().slice(0, 10);
const invoiceNumber = nextInvoiceNumber(issuedAt);

const invoiceInput = {
  number: invoiceNumber,
  issuedAt,
  issuer: demoIssuer,
  counterparty: {
    name: "Acme Corp",
    email: "ap@acme.example",
    address: "1 Main Street",
  },
  lines: exampleLines,
  currency: "USD",
};

describe("nextInvoiceNumber", () => {
  it("uses the INV-YYYYMMDD-XXXX shape", () => {
    expect(nextInvoiceNumber(issuedAt)).toMatch(
      new RegExp(`^INV-${issuedDate.replaceAll("-", "")}-[A-Z0-9]{4}$`),
    );
  });
});

describe("renderInvoicePdf", () => {
  it("draws the issued date, From, and Bill to labels", async () => {
    const spy = vi.spyOn(PDFPage.prototype, "drawText");

    try {
      await renderInvoicePdf(invoiceInput);
      const texts = spy.mock.calls.map(([text]) => text);

      expect(texts).toContain("INVOICE");
      expect(texts).toContain(invoiceNumber);
      expect(texts).toContain(`Issued ${issuedDate}`);
      expect(texts).toContain("From");
      expect(texts).toContain("Bill to");
      expect(texts).toContain("Northwind Labs");
      expect(texts).toContain("Acme Corp");
    } finally {
      spy.mockRestore();
    }
  });

  it("returns a valid A4 PDF and the line subtotal", async () => {
    const { pdf, subtotal } = await renderInvoicePdf(invoiceInput);

    expect(subtotal).toBe(1520);
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");

    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeCloseTo(595.28);
    expect(height).toBeCloseTo(841.89);
  });

  it("still totals the same when notes are present", async () => {
    const { pdf, subtotal } = await renderInvoicePdf({
      ...invoiceInput,
      notes: "Payment due in 30 days.\nThank you.",
    });

    expect(subtotal).toBe(1520);
    await PDFDocument.load(pdf);
  });

  it("renders when bill-to has only a name", async () => {
    const { pdf, subtotal } = await renderInvoicePdf({
      ...invoiceInput,
      counterparty: { name: "Acme" },
    });

    expect(subtotal).toBe(1520);
    await PDFDocument.load(pdf);
  });

  it("wraps a long description without failing", async () => {
    const { pdf, subtotal } = await renderInvoicePdf({
      ...invoiceInput,
      lines: [
        {
          description:
            "Extended discovery, architecture, and implementation for the billing portal",
          quantity: 2,
          unitPrice: 100,
        },
      ],
    });

    expect(subtotal).toBe(200);
    await PDFDocument.load(pdf);
  });
});

