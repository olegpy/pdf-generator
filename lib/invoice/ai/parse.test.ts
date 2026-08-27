import { describe, expect, it } from "vitest";
import { appOrigin } from "../../config";
import { demoIssuer } from "../demo";
import { nextInvoiceNumber } from "../pdf/render";
import { invoiceFromToolOutput, issuerFromToolOutput } from "./parse";

const INVOICE_ID = "11111111-1111-4111-8111-111111111111";
const INVOICE_NUMBER = nextInvoiceNumber(new Date());

const invoiceOutput = {
  invoiceId: INVOICE_ID,
  number: INVOICE_NUMBER,
  downloadUrl: `${appOrigin}/api/invoices/${INVOICE_ID}`,
  filename: `${INVOICE_NUMBER}.pdf`,
  totals: { subtotal: 1520, total: 1520, currency: "USD" },
};

describe("invoiceFromToolOutput", () => {
  it("reads a flat tool result", () => {
    expect(invoiceFromToolOutput(invoiceOutput)).toEqual(invoiceOutput);
  });

  it("reads MCP structuredContent", () => {
    expect(
      invoiceFromToolOutput({ structuredContent: invoiceOutput }),
    ).toEqual(invoiceOutput);
  });

  it("falls back to id and subtotal when optional fields are missing", () => {
    expect(
      invoiceFromToolOutput({
        id: "abc",
        number: "INV-1",
        downloadUrl: `${appOrigin}/api/invoices/abc`,
        filename: "INV-1.pdf",
        totals: { subtotal: 10, currency: "USD" },
      }),
    ).toEqual({
      invoiceId: "abc",
      number: "INV-1",
      downloadUrl: `${appOrigin}/api/invoices/abc`,
      filename: "INV-1.pdf",
      totals: { subtotal: 10, total: 10, currency: "USD" },
    });
  });

  it("returns null for unusable output", () => {
    expect(invoiceFromToolOutput(null)).toBeNull();
    expect(invoiceFromToolOutput({ number: "INV-1" })).toBeNull();
  });
});

describe("issuerFromToolOutput", () => {
  it("reads a flat seller payload", () => {
    expect(issuerFromToolOutput(demoIssuer)).toEqual(demoIssuer);
  });

  it("reads MCP structuredContent", () => {
    expect(issuerFromToolOutput({ structuredContent: demoIssuer })).toEqual(
      demoIssuer,
    );
  });

  it("returns null when seller fields are missing", () => {
    expect(issuerFromToolOutput({ name: "Northwind Labs" })).toBeNull();
  });
});
