import { z } from "zod";
import { renderInvoicePdf } from "./pdf/render";
import {
  invoiceLineInputSchema,
  invoiceSchema,
  type Invoice,
} from "./schema";
import { getInvoice } from "./store";

export const invoiceSnapshotSchema = invoiceSchema
  .omit({ totals: true, downloadUrl: true })
  .extend({
    lines: z.array(invoiceLineInputSchema).min(1),
  });

export type InvoiceSnapshot = z.infer<typeof invoiceSnapshotSchema>;

export function snapshotFromInvoice(
  invoice: Omit<Invoice, "downloadUrl" | "totals">,
): InvoiceSnapshot {
  return {
    ...invoice,
    lines: invoice.lines.map(({ description, quantity, unitPrice }) => ({
      description,
      quantity,
      unitPrice,
    })),
  };
}

export function encodeInvoiceSnapshot(snapshot: InvoiceSnapshot) {
  return Buffer.from(JSON.stringify(snapshot), "utf8").toString("base64url");
}

export function decodeInvoiceSnapshot(token: string) {
  try {
    const parsed = invoiceSnapshotSchema.safeParse(
      JSON.parse(Buffer.from(token, "base64url").toString("utf8")),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function loadInvoiceFile(id: string, token?: string | null) {
  const stored = getInvoice(id);
  if (stored) {
    return { pdf: stored.pdf, filename: stored.filename };
  }

  const snapshot = token ? decodeInvoiceSnapshot(token) : null;
  if (!snapshot || snapshot.id !== id) {
    return null;
  }

  const { pdf } = await renderInvoicePdf({
    number: snapshot.number,
    issuedAt: new Date(snapshot.issuedAt),
    issuer: snapshot.issuer,
    counterparty: snapshot.counterparty,
    lines: snapshot.lines,
    currency: snapshot.currency,
    notes: snapshot.notes,
  });

  return { pdf, filename: snapshot.filename };
}
