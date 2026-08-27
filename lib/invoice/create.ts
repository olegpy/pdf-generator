import { demoIssuer } from "./demo";
import { nextInvoiceNumber, renderInvoicePdf } from "./pdf/render";
import {
  invoiceDraftSchema,
  type GenerateInvoiceInput,
  type GenerateInvoiceOutput,
  type Invoice,
  type InvoiceLine,
} from "./schema";
import { saveInvoice } from "./store";

export function computeLineAmount(quantity: number, unitPrice: number) {
  return quantity * unitPrice;
}

export function toInvoiceLines(
  lines: GenerateInvoiceInput["lines"],
): InvoiceLine[] {
  return lines.map((line) => ({
    ...line,
    amount: computeLineAmount(line.quantity, line.unitPrice),
  }));
}

export async function createInvoice(
  input: GenerateInvoiceInput,
  origin: string,
): Promise<{ invoice: Invoice; result: GenerateInvoiceOutput; pdf: Uint8Array }> {
  const issuedAt = new Date();
  const id = crypto.randomUUID();
  const number = nextInvoiceNumber(issuedAt);
  const seller = input.issuer ?? demoIssuer;
  const currency = input.currency?.trim() || "USD";
  const lines = toInvoiceLines(input.lines);
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const filename = `${number}.pdf`;
  const downloadUrl = `${origin}/api/invoices/${id}`;

  const { pdf } = await renderInvoicePdf({
    number,
    issuedAt,
    issuer: seller,
    counterparty: input.counterparty,
    lines: input.lines,
    currency,
    notes: input.notes,
  });

  const invoice: Invoice = {
    id,
    number,
    issuedAt: issuedAt.toISOString(),
    currency,
    issuer: seller,
    counterparty: input.counterparty,
    lines,
    totals: {
      subtotal,
      total: subtotal,
      currency,
    },
    notes: input.notes,
    filename,
    downloadUrl,
  };

  saveInvoice({
    id,
    number,
    filename,
    pdf,
    createdAt: issuedAt.toISOString(),
    invoice,
  });

  return {
    invoice,
    pdf,
    result: { ...invoice, invoiceId: id },
  };
}

export function originFromRequest(req?: Request) {
  if (req) {
    return new URL(req.url).origin;
  }
  return process.env.APP_URL ?? "http://localhost:3000";
}

export function originFromHeaders(
  headerList: Pick<Headers, "get">,
) {
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) {
    return process.env.APP_URL ?? "http://localhost:3000";
  }
  const proto =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  return `${proto}://${host}`;
}

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function numbers(formData: FormData, name: string) {
  return formData.getAll(name).map((value) => Number(value));
}

export function draftFromFormData(formData: FormData) {
  const descriptions = formData.getAll("description").map((value) =>
    String(value).trim(),
  );
  const quantities = numbers(formData, "quantity");
  const unitPrices = numbers(formData, "unitPrice");

  return invoiceDraftSchema.safeParse({
    issuer: {
      name: text(formData, "issuerName"),
      email: text(formData, "issuerEmail"),
      taxId: text(formData, "issuerTaxId"),
      address: text(formData, "issuerAddress"),
    },
    counterparty: {
      name: text(formData, "counterpartyName"),
      email: text(formData, "counterpartyEmail"),
      address: text(formData, "counterpartyAddress"),
    },
    lines: descriptions
      .map((description, index) => ({
        description,
        quantity: quantities[index],
        unitPrice: unitPrices[index],
      }))
      .filter((line) => line.description),
    notes: text(formData, "notes"),
    currency: "USD",
  });
}
