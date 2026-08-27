import type { NextRequest } from "next/server";
import { getInvoice } from "@/lib/invoice/store";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/invoices/[id]">,
) {
  const { id } = await ctx.params;
  const invoice = getInvoice(id);

  if (!invoice) {
    return Response.json({ error: "Invoice not found" }, { status: 404 });
  }

  return new Response(Buffer.from(invoice.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
