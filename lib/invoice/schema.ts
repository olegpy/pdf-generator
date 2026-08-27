import { z } from "zod";

function emptyToUndefined(value: unknown) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

const optionalText = z.preprocess(
  emptyToUndefined,
  z.string().max(2000, "Text is too long").optional(),
);

const optionalEmail = z.preprocess(
  emptyToUndefined,
  z.email("Enter a valid email").optional(),
);

const requiredName = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(200, "Name is too long");

const requiredAddress = z
  .string()
  .trim()
  .min(1, "Address is required")
  .max(500, "Address is too long");

const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code like USD");

const optionalCurrency = z.preprocess(
  emptyToUndefined,
  currencyCode.optional(),
);

const money = z
  .number({ error: "Must be a number" })
  .nonnegative("Must be zero or greater")
  .max(1_000_000, "Amount is too large");

const quantity = z
  .number({ error: "Must be a number" })
  .positive("Quantity must be greater than zero")
  .max(10_000, "Quantity is too large");

export const issuerSchema = z.object({
  name: requiredName,
  address: requiredAddress,
  email: z.email("Enter a valid email"),
  taxId: z
    .string()
    .trim()
    .min(1, "Tax ID is required")
    .max(64, "Tax ID is too long"),
});

export const counterpartySchema = z.object({
  name: requiredName.describe("Company or person to bill"),
  address: optionalText.describe("Optional mailing address"),
  email: optionalEmail.describe("Optional billing email"),
});

export const invoiceLineInputSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(200, "Description is too long")
    .describe("Line description"),
  quantity: quantity.describe("Quantity"),
  unitPrice: money.describe("Unit price"),
});

export const invoiceLineSchema = invoiceLineInputSchema.extend({
  amount: money.describe("quantity * unitPrice"),
});

export const invoiceTotalsSchema = z.object({
  subtotal: money,
  total: money,
  currency: currencyCode,
});

export const invoiceDraftSchema = z.object({
  issuer: issuerSchema.optional(),
  counterparty: counterpartySchema,
  lines: z
    .array(invoiceLineInputSchema)
    .min(1, "Add at least one line"),
  notes: optionalText,
  currency: optionalCurrency.describe("ISO code, defaults to USD"),
});

export const invoiceSchema = z.object({
  id: z.uuid(),
  number: z
    .string()
    .min(1)
    .regex(/^INV-\d{8}-[A-Z0-9]+$/, "Invalid invoice number"),
  issuedAt: z.iso.datetime(),
  currency: currencyCode,
  issuer: issuerSchema,
  counterparty: counterpartySchema,
  lines: z.array(invoiceLineSchema).min(1),
  totals: invoiceTotalsSchema,
  notes: optionalText,
  filename: z
    .string()
    .min(1)
    .endsWith(".pdf", "Filename must be a PDF"),
  downloadUrl: z.url("Invalid download URL"),
});

export const generateInvoiceInputSchema = invoiceDraftSchema;
export const generateInvoiceOutputSchema = invoiceSchema.extend({
  invoiceId: z.uuid(),
});

export type Issuer = z.infer<typeof issuerSchema>;
export type Counterparty = z.infer<typeof counterpartySchema>;
export type InvoiceLineInput = z.infer<typeof invoiceLineInputSchema>;
export type InvoiceLine = z.infer<typeof invoiceLineSchema>;
export type InvoiceDraft = z.infer<typeof invoiceDraftSchema>;
export type Invoice = z.infer<typeof invoiceSchema>;
export type GenerateInvoiceInput = InvoiceDraft;
export type GenerateInvoiceOutput = z.infer<typeof generateInvoiceOutputSchema>;
