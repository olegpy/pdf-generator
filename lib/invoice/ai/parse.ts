import type { Issuer } from "../schema";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

export type InvoiceDownload = {
  invoiceId: string;
  number: string;
  downloadUrl: string;
  filename: string;
  totals: {
    subtotal: number;
    total: number;
    currency: string;
  };
};

export function invoiceFromToolOutput(output: unknown): InvoiceDownload | null {
  const record = asRecord(output);
  if (!record) return null;

  const nested = asRecord(record.structuredContent) ?? record;
  if (
    typeof nested.downloadUrl !== "string" ||
    typeof nested.number !== "string" ||
    typeof nested.filename !== "string"
  ) {
    return null;
  }

  const totals = asRecord(nested.totals);
  if (typeof totals?.subtotal !== "number" || typeof totals.currency !== "string") {
    return null;
  }

  return {
    invoiceId: String(nested.invoiceId ?? nested.id ?? ""),
    number: nested.number,
    downloadUrl: nested.downloadUrl,
    filename: nested.filename,
    totals: {
      subtotal: totals.subtotal,
      total: typeof totals.total === "number" ? totals.total : totals.subtotal,
      currency: totals.currency,
    },
  };
}

export function issuerFromToolOutput(output: unknown): Issuer | null {
  const record = asRecord(output);
  if (!record) return null;
  const nested = asRecord(record.structuredContent) ?? record;
  if (
    typeof nested.name !== "string" ||
    typeof nested.email !== "string" ||
    typeof nested.address !== "string" ||
    typeof nested.taxId !== "string"
  ) {
    return null;
  }
  return {
    name: nested.name,
    address: nested.address,
    email: nested.email,
    taxId: nested.taxId,
  };
}
