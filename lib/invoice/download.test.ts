import { describe, expect, it } from "vitest";
import { appOrigin } from "../config";
import { createInvoice } from "./create";
import { exampleLines } from "./demo";
import {
  decodeInvoiceSnapshot,
  encodeInvoiceSnapshot,
  loadInvoiceFile,
  snapshotFromInvoice,
} from "./download";
import { invoiceStore } from "./store";

describe("invoice download snapshot", () => {
  it("rebuilds a PDF from the download token without the memory store", async () => {
    const { invoice } = await createInvoice(
      {
        counterparty: { name: "Acme" },
        lines: exampleLines,
      },
      appOrigin,
    );

    const token = encodeInvoiceSnapshot(snapshotFromInvoice(invoice));
    expect(token).toBeTruthy();

    const snapshot = decodeInvoiceSnapshot(token ?? "");
    expect(snapshot).toMatchObject({
      id: invoice.id,
      number: invoice.number,
      issuer: invoice.issuer,
      counterparty: invoice.counterparty,
      lines: exampleLines,
      filename: invoice.filename,
    });

    invoiceStore.delete(invoice.id);

    const restored = await loadInvoiceFile(invoice.id, token);
    expect(restored?.filename).toBe(invoice.filename);
    expect(new TextDecoder().decode(restored?.pdf.slice(0, 5))).toBe("%PDF-");
  });

  it("rejects a token for a different invoice id", async () => {
    const { invoice } = await createInvoice(
      {
        counterparty: { name: "Acme" },
        lines: exampleLines,
      },
      appOrigin,
    );
    const token = encodeInvoiceSnapshot(snapshotFromInvoice(invoice));
    invoiceStore.delete(invoice.id);

    await expect(
      loadInvoiceFile(crypto.randomUUID(), token),
    ).resolves.toBeNull();
  });
});
