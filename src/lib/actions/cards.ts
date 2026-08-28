"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { slugify, withCollisionSuffix } from "@/lib/slug";
import { generateShortCode } from "@/lib/cards/short-code";
import { cardPath } from "@/lib/cards/links";

/**
 * Write side of the digital cards feature.
 *
 * Every action re-checks ownership against the signed-in user rather than
 * trusting an id from the form: an organisation id in a POST body is
 * attacker-controlled.
 */

async function requireOwnedOrganisation(organisationId: string) {
  const user = await requireUser();
  const org = await prisma.organisation.findFirst({
    where: { id: organisationId, owner_id: user.id },
  });
  if (!org) redirect("/dashboard/companies");
  return { user, org };
}

/** Finds a free slug, retrying with a random suffix on collision. */
async function uniqueSlug(
  base: string,
  table: "organisation" | "contactCard"
): Promise<string> {
  const root = slugify(base) || "card";
  let candidate = root;

  for (let attempt = 0; attempt < 6; attempt++) {
    const taken =
      table === "organisation"
        ? await prisma.organisation.findUnique({ where: { slug: candidate } })
        : await prisma.contactCard.findUnique({ where: { slug: candidate } });
    if (!taken) return candidate;
    candidate = withCollisionSuffix(root);
  }

  throw new Error(`Could not find a free slug for "${base}"`);
}

/**
 * Short codes are the one identifier that must never collide: a duplicate would
 * silently point a printed QR code at the wrong person. Retry until clear
 * rather than trusting randomness.
 */
async function uniqueShortCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateShortCode();
    const taken = await prisma.contactCard.findUnique({
      where: { short_code: candidate },
    });
    if (!taken) return candidate;
  }
  throw new Error("Could not allocate a unique short code");
}

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

function optional(form: FormData, key: string): string | null {
  const value = text(form, key);
  return value === "" ? null : value;
}

export async function createOrganisationAction(form: FormData) {
  const user = await requireUser();
  const name = text(form, "name");
  if (!name) throw new Error("Name is required");

  const org = await prisma.organisation.create({
    data: {
      owner_id: user.id,
      name,
      legal_name: text(form, "legal_name") || name,
      slug: await uniqueSlug(name, "organisation"),
      website: optional(form, "website"),
      website_label: optional(form, "website_label"),
      logo_url: optional(form, "logo_url"),
      tagline: optional(form, "tagline"),
      ...brandFields(form),
    },
  });

  revalidatePath("/dashboard/companies");
  redirect(`/dashboard/companies/${org.slug}`);
}

export async function updateOrganisationAction(form: FormData) {
  const { org } = await requireOwnedOrganisation(text(form, "organisation_id"));
  const name = text(form, "name");
  if (!name) throw new Error("Name is required");

  await prisma.organisation.update({
    where: { id: org.id },
    data: {
      name,
      legal_name: text(form, "legal_name") || name,
      website: optional(form, "website"),
      website_label: optional(form, "website_label"),
      logo_url: optional(form, "logo_url"),
      tagline: optional(form, "tagline"),
      ...brandFields(form),
    },
  });

  revalidatePath(`/dashboard/companies/${org.slug}`);
  redirect(`/dashboard/companies/${org.slug}`);
}

export async function createCardAction(form: FormData) {
  const { org } = await requireOwnedOrganisation(text(form, "organisation_id"));

  const firstName = text(form, "first_name");
  const lastName = text(form, "last_name");
  if (!firstName || !lastName) throw new Error("First and last name are required");

  const slug = await uniqueSlug(`${firstName} ${lastName}`, "contactCard");

  await prisma.contactCard.create({
    data: {
      organisation_id: org.id,
      slug,
      short_code: await uniqueShortCode(),
      // Points at its own page to begin with; editable later without
      // invalidating the short code.
      destination: cardPath(slug),
      first_name: firstName,
      last_name: lastName,
      title: text(form, "title"),
      email: text(form, "email"),
      phone_mobile: optional(form, "phone_mobile"),
      phone_work: optional(form, "phone_work"),
      photo_url: optional(form, "photo_url"),
    },
  });

  revalidatePath(`/dashboard/companies/${org.slug}`);
  redirect(`/dashboard/companies/${org.slug}`);
}

export async function updateCardAction(form: FormData) {
  const user = await requireUser();
  const cardId = text(form, "card_id");

  const card = await prisma.contactCard.findFirst({
    where: { id: cardId, organisation: { owner_id: user.id } },
    include: { organisation: true },
  });
  if (!card) redirect("/dashboard/companies");

  const firstName = text(form, "first_name");
  const lastName = text(form, "last_name");
  if (!firstName || !lastName) throw new Error("First and last name are required");

  // A renamed person may want a matching slug, but the short code stays put so
  // anything already printed keeps resolving. The destination follows the new
  // slug so the redirect lands in the right place.
  const requestedSlug = slugify(text(form, "slug"));
  const slugChanged = requestedSlug !== "" && requestedSlug !== card.slug;
  const slug = slugChanged
    ? await uniqueSlug(requestedSlug, "contactCard")
    : card.slug;

  await prisma.contactCard.update({
    where: { id: card.id },
    data: {
      slug,
      destination: slugChanged ? cardPath(slug) : card.destination,
      first_name: firstName,
      last_name: lastName,
      title: text(form, "title"),
      email: text(form, "email"),
      phone_mobile: optional(form, "phone_mobile"),
      phone_work: optional(form, "phone_work"),
      photo_url: optional(form, "photo_url"),
      status: text(form, "status") === "archived" ? "archived" : "active",
    },
  });

  revalidatePath(`/dashboard/companies/${card.organisation.slug}`);
  revalidatePath(cardPath(slug));
  redirect(`/dashboard/companies/${card.organisation.slug}`);
}

export async function setCardStatusAction(form: FormData) {
  const user = await requireUser();
  const cardId = text(form, "card_id");
  const status = text(form, "status") === "archived" ? "archived" : "active";

  const card = await prisma.contactCard.findFirst({
    where: { id: cardId, organisation: { owner_id: user.id } },
    include: { organisation: true },
  });
  if (!card) redirect("/dashboard/companies");

  await prisma.contactCard.update({
    where: { id: card.id },
    data: { status },
  });

  revalidatePath(`/dashboard/companies/${card.organisation.slug}`);
}

function brandFields(form: FormData) {
  return {
    brand_primary: hex(form, "brand_primary", "#1DB8AF"),
    brand_secondary: hex(form, "brand_secondary", "#87CFC8"),
    brand_accent: hex(form, "brand_accent", "#F1666B"),
    brand_ink: hex(form, "brand_ink", "#464F58"),
  };
}

/** Colours land in a style attribute, so anything not a hex literal is rejected. */
function hex(form: FormData, key: string, fallback: string): string {
  const value = text(form, key);
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}
