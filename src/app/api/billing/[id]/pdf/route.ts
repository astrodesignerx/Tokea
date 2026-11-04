import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildPdfDocument } from "@/lib/billing/pdf/model";
import { renderBillingPdf } from "@/lib/billing/pdf/render";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Sign in to view this PDF." }, { status: 401 });
  const ownerId = session.user.id;
  const { id } = await params;
  const doc = await prisma.billingDocument.findFirst({
    where: { id, owner_id: ownerId }, include: { items: { orderBy: { position: "asc" } } },
  });
  if (!doc) return Response.json({ error: "Document not found." }, { status: 404 });
  try {
    const [profile, invoice] = await Promise.all([
      prisma.billingProfile.findUnique({ where: { user_id: ownerId } }),
      doc.type === "receipt" && doc.invoice_id ? prisma.billingDocument.findFirst({
        where: { id: doc.invoice_id, owner_id: ownerId }, select: { number: true, issue_date: true, total: true, amount_paid: true },
      }) : null,
    ]);
    const model = await buildPdfDocument({ ...doc, invoice }, profile, session.user.name || session.user.email || "Business");
    const pdf = await renderBillingPdf(model);
    const filename = `${doc.number.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 180) || "document"}.pdf`;
    const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";
    return new Response(new Uint8Array(pdf), { headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Cache-Control": "private, no-store",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
    } });
  } catch (error) {
    console.error("Billing PDF render failed", { documentId: id, error });
    return Response.json({ error: "Unable to create this PDF." }, { status: 500, headers: { "Cache-Control": "private, no-store" } });
  }
}
