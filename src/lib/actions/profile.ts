"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";

export type ProfileState = { error: string | null; savedAt?: number };

export async function updateProfileName(formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const value = formData.get("name");
  if (typeof value !== "string") return { error: "Enter a name, or leave it blank." };
  const name = value.trim();
  if (name.length > 80) return { error: "Use at most 80 characters for your name." };

  try {
    await prisma.user.update({ where: { id: user.id }, data: { name: name || null } });
  } catch {
    return { error: "Could not save your name. Please try again." };
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/");
  return { error: null, savedAt: Date.now() };
}
