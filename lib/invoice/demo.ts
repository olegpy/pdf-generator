import type { InvoiceLineInput, Issuer } from "./schema";

/** Sample data for the demo UI and agent. Not loaded from a database. */
export const demoIssuer: Issuer = {
  name: "Northwind Labs",
  address: "120 Market Street, Suite 4\nSan Francisco, CA 94103",
  email: "billing@northwind.example",
  taxId: "US-94-1234567",
};

export const examplePrompt =
  "Make an invoice with these lines: Development, qty 10, $150 each; Notion license, qty 1, $20";

export const exampleLines: InvoiceLineInput[] = [
  { description: "Development", quantity: 10, unitPrice: 150 },
  { description: "Notion license", quantity: 1, unitPrice: 20 },
];
