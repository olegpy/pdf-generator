import { describe, expect, it } from "vitest";
import { appOrigin } from "../config";
import { demoIssuer, exampleLines } from "./demo";
import { nextInvoiceNumber } from "./pdf/render";
import { invoiceDraftSchema, invoiceSchema } from "./schema";

const validDraft = {
  issuer: demoIssuer,
  counterparty: { name: "Acme" },
  lines: exampleLines,
};

describe("invoiceDraftSchema", () => {
  it("accepts a complete draft", () => {
    const parsed = invoiceDraftSchema.safeParse(validDraft);
    expect(parsed.success).toBe(true);
  });

  it("requires a bill-to name", () => {
    const parsed = invoiceDraftSchema.safeParse({
      ...validDraft,
      counterparty: { name: "  " },
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe("Name is required");
    }
  });

  it("requires at least one line", () => {
    const parsed = invoiceDraftSchema.safeParse({
      ...validDraft,
      lines: [],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe("Add at least one line");
    }
  });

  it("rejects a zero quantity", () => {
    const parsed = invoiceDraftSchema.safeParse({
      ...validDraft,
      lines: [{ description: "Work", quantity: 0, unitPrice: 10 }],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe(
        "Quantity must be greater than zero",
      );
    }
  });

  it("rejects a negative unit price", () => {
    const parsed = invoiceDraftSchema.safeParse({
      ...validDraft,
      lines: [{ description: "Work", quantity: 1, unitPrice: -1 }],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe("Must be zero or greater");
    }
  });

  it("treats blank optional fields as omitted", () => {
    const parsed = invoiceDraftSchema.safeParse({
      ...validDraft,
      counterparty: {
        name: "Acme",
        email: "  ",
        address: "",
      },
      notes: "   ",
      currency: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.counterparty.email).toBeUndefined();
      expect(parsed.data.counterparty.address).toBeUndefined();
      expect(parsed.data.notes).toBeUndefined();
      expect(parsed.data.currency).toBeUndefined();
    }
  });

  it("uppercases a 3-letter currency", () => {
    const parsed = invoiceDraftSchema.safeParse({
      ...validDraft,
      currency: "usd",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.currency).toBe("USD");
    }
  });

  it("rejects an invalid currency code", () => {
    const parsed = invoiceDraftSchema.safeParse({
      ...validDraft,
      currency: "US",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an invalid optional email", () => {
    const parsed = invoiceDraftSchema.safeParse({
      ...validDraft,
      counterparty: { name: "Acme", email: "not-an-email" },
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe("Enter a valid email");
    }
  });
});

describe("invoiceSchema", () => {
  it("accepts a generated invoice shape", () => {
    const issuedAt = new Date();
    const number = nextInvoiceNumber(issuedAt);
    const parsed = invoiceSchema.safeParse({
      id: crypto.randomUUID(),
      number,
      issuedAt: issuedAt.toISOString(),
      currency: "USD",
      issuer: demoIssuer,
      counterparty: { name: "Acme" },
      lines: [
        {
          description: "Development",
          quantity: 10,
          unitPrice: 150,
          amount: 1500,
        },
      ],
      totals: { subtotal: 1500, total: 1500, currency: "USD" },
      filename: `${number}.pdf`,
      downloadUrl: `${appOrigin}/api/invoices/abc`,
    });
    expect(parsed.success).toBe(true);
  });
});
