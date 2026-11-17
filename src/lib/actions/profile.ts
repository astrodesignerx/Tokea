"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { isAvatarPublicUrl } from "@/lib/storage";

export type ProfileField =
  | "name"
  | "job_title"
  | "phone"
  | "bio"
  | "default_organisation_id";

export type ProfileState = {
  error: string | null;
  fieldErrors?: Partial<Record<ProfileField, string>>;
  savedAt?: number;
};

const PHONE_PATTERN = /^[0-9+\-\s()]*$/;

function readField(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (value === null) return "";
  if (typeof value !== "string") return null;
  return value.trim();
}

export async function updateProfile(formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const fieldErrors: Partial<Record<ProfileField, string>> = {};

  const name = readField(formData, "name");
  if (name === null) {
    fieldErrors.name = "Enter a valid name.";
  } else if (name.length > 80) {
    fieldErrors.name = "Use at most 80 characters for your name.";
  }

  const jobTitle = readField(formData, "job_title");
  if (jobTitle === null) {
    fieldErrors.job_title = "Enter a valid job title.";
  } else if (jobTitle.length > 80) {
    fieldErrors.job_title = "Use at most 80 characters for your job title.";
  }

  const phone = readField(formData, "phone");
  if (phone === null) {
    fieldErrors.phone = "Enter a valid phone number.";
  } else if (phone.length > 30) {
    fieldErrors.phone = "Use at most 30 characters for your phone number.";
  } else if (!PHONE_PATTERN.test(phone)) {
    fieldErrors.phone = "Use only digits, spaces, +, -, ( and ).";
  }

  const bio = readField(formData, "bio");
  if (bio === null) {
    fieldErrors.bio = "Enter a valid bio.";
  } else if (bio.length > 280) {
    fieldErrors.bio = "Use at most 280 characters for your bio.";
  }

  const rawOrgId = readField(formData, "default_organisation_id");
  let defaultOrganisationId: string | null = null;
  if (rawOrgId === null) {
    fieldErrors.default_organisation_id = "Choose a valid company.";
  } else if (rawOrgId !== "" && rawOrgId !== "none") {
    const owned = await prisma.organisation.findFirst({
      where: { id: rawOrgId, owner_id: user.id },
      select: { id: true },
    });
    if (!owned) {
      fieldErrors.default_organisation_id = "Choose one of your companies.";
    } else {
      defaultOrganisationId = owned.id;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      error: "Check the highlighted fields and try again.",
      fieldErrors,
    };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name || null,
        job_title: jobTitle || null,
        phone: phone || null,
        bio: bio || null,
        default_organisation_id: defaultOrganisationId,
      },
    });
  } catch {
    return { error: "Could not save your profile. Please try again." };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/");
  return { error: null, fieldErrors: {}, savedAt: Date.now() };
}

export async function updateProfilePhoto(url: string): Promise<ProfileState> {
  const user = await requireUser();
  if (typeof url !== "string") {
    return { error: "Choose a valid image to upload." };
  }
  const trimmed = url.trim();
  if (!isAvatarPublicUrl(trimmed)) {
    return { error: "That photo link could not be verified." };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { image: trimmed },
    });
  } catch {
    return { error: "Could not save your photo. Please try again." };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/");
  return { error: null, savedAt: Date.now() };
}

export async function removeProfilePhoto(): Promise<ProfileState> {
  const user = await requireUser();

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { image: null },
    });
  } catch {
    return { error: "Could not remove your photo. Please try again." };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/");
  return { error: null, savedAt: Date.now() };
}
