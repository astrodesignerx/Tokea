import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findOwnedForm, listVersions } from "@/lib/forms/data";
import { responsesToCsv } from "@/lib/forms/csv";

/**
 * Owner-only CSV download. Both a missing session and someone else's form id
 * answer 404, so the route never confirms that a form exists.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Not found", { status: 404 });
  }

  const { id } = await params;
  const form = await findOwnedForm(id, session.user.id);
  if (!form) {
    return new Response("Not found", { status: 404 });
  }

  const [versions, responses] = await Promise.all([
    listVersions(form.id),
    prisma.formResponse.findMany({
      where: { form_id: form.id },
      orderBy: { submitted_at: "desc" },
    }),
  ]);

  const csv = responsesToCsv(
    versions.map((version) => ({
      id: version.id,
      number: version.number,
      fields: version.fields,
    })),
    responses.map((response) => ({
      version_id: response.version_id,
      answers: response.answers,
      submitted_at: response.submitted_at,
    })),
  );

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${form.slug}-responses.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
