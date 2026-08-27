import type { Invoice } from "./schema";

export type StoredInvoice = {
  id: string;
  number: string;
  filename: string;
  pdf: Uint8Array;
  createdAt: string;
  invoice: Invoice;
};

const globalForInvoices = globalThis as typeof globalThis & {
  invoiceStore?: Map<string, StoredInvoice>;
};

export const invoiceStore =
  globalForInvoices.invoiceStore ?? new Map<string, StoredInvoice>();

globalForInvoices.invoiceStore = invoiceStore;

export function saveInvoice(invoice: StoredInvoice) {
  invoiceStore.set(invoice.id, invoice);
}

export function getInvoice(id: string) {
  return invoiceStore.get(id);
}
