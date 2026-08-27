import { describe, expect, it } from "vitest";
import { appOrigin } from "../config";
import {
  computeLineAmount,
  createInvoice,
  draftFromFormData,
  originFromHeaders,
  originFromRequest,
  toInvoiceLines,
} from "./create";
import { demoIssuer, exampleLines } from "./demo";
import { invoiceSchema } from "./schema";
import { getInvoice } from "./store";

function formFrom(entries: Record<string, string | string[]>) {
  const formData = new FormData();
  for (const [name, value] of Object.entries(entries)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        formData.append(name, item);
      }
    } else {
      formData.set(name, value);
    }
  }
  return formData;
}

const issuerFields = {
  issuerName: demoIssuer.name,
  issuerEmail: demoIssuer.email,
  issuerTaxId: demoIssuer.taxId,
  issuerAddress: demoIssuer.address,
};

describe("computeLineAmount", () => {
  it("multiplies quantity by unit price", () => {
    expect(computeLineAmount(10, 150)).toBe(1500);
  });
});

describe("toInvoiceLines", () => {
  it("adds an amount on each line", () => {
    expect(toInvoiceLines(exampleLines)).toEqual([
      { description: "Development", quantity: 10, unitPrice: 150, amount: 1500 },
      { description: "Notion license", quantity: 1, unitPrice: 20, amount: 20 },
    ]);
  });
});

describe("originFromHeaders", () => {
  it("prefers forwarded host and proto", () => {
    expect(
      originFromHeaders(
        new Headers({
          "x-forwarded-host": "invoices.example",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe("https://invoices.example");
  });

  it("uses http for localhost", () => {
    expect(originFromHeaders(new Headers({ host: "localhost:3000" }))).toBe(
      "http://localhost:3000",
    );
  });

  it("falls back when no host is present", () => {
    expect(originFromHeaders(new Headers())).toBe(appOrigin);
  });
});

describe("originFromRequest", () => {
  it("reads the origin from the request URL", () => {
    expect(
      originFromRequest(new Request("https://demo.example/api/invoices")),
    ).toBe("https://demo.example");
  });
});

describe("draftFromFormData", () => {
  it("maps form fields into a draft", () => {
    const parsed = draftFromFormData(
      formFrom({
        ...issuerFields,
        counterpartyName: "Acme",
        description: ["Development", "Notion license"],
        quantity: ["10", "1"],
        unitPrice: ["150", "20"],
      }),
    );

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.counterparty.name).toBe("Acme");
      expect(parsed.data.lines).toEqual(exampleLines);
      expect(parsed.data.currency).toBe("USD");
    }
  });

  it("drops lines with a blank description", () => {
    const parsed = draftFromFormData(
      formFrom({
        ...issuerFields,
        counterpartyName: "Acme",
        description: ["Development", ""],
        quantity: ["10", "1"],
        unitPrice: ["150", "20"],
      }),
    );

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.lines).toEqual([
        { description: "Development", quantity: 10, unitPrice: 150 },
      ]);
    }
  });

  it("fails when bill-to is missing", () => {
    const parsed = draftFromFormData(
      formFrom({
        ...issuerFields,
        description: ["Development"],
        quantity: ["10"],
        unitPrice: ["150"],
      }),
    );

    expect(parsed.success).toBe(false);
  });
});

describe("createInvoice", () => {
  it("builds a stored invoice and a PDF", async () => {
    const { invoice, result, pdf } = await createInvoice(
      {
        counterparty: { name: "Acme" },
        lines: exampleLines,
      },
      appOrigin,
    );

    expect(invoiceSchema.safeParse(invoice).success).toBe(true);
    expect(invoice.issuer).toEqual(demoIssuer);
    expect(invoice.totals.total).toBe(1520);
    expect(invoice.filename).toBe(`${invoice.number}.pdf`);
    expect(invoice.downloadUrl).toBe(
      `${appOrigin}/api/invoices/${invoice.id}`,
    );
    expect(result.invoiceId).toBe(invoice.id);
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
    expect(getInvoice(invoice.id)?.filename).toBe(invoice.filename);
  });
});
