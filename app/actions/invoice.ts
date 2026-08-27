"use server";

import { createInvoice, draftFromFormData, originFromHeaders } from "@/lib/invoice/create";
import type { Invoice } from "@/lib/invoice/schema";
import { headers } from "next/headers";

export type InvoiceFormState = {
  invoice: Invoice | null;
  error: string | null;
};

export async function createInvoiceAction(
  _prevState: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  const parsed = draftFromFormData(formData);

  if (!parsed.success) {
    return {
      invoice: null,
      error: parsed.error.issues[0]?.message ?? "Invalid invoice",
    };
  }

  const { invoice } = await createInvoice(
    parsed.data,
    originFromHeaders(await headers()),
  );

  return { invoice, error: null };
}
