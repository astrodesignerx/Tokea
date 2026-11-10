import { cache } from "react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function todoResponseCounts(listId: string, ownerId: string) {
  const where = { list_id: listId, list: { owner_id: ownerId }, status: { not: "archived" } };
  const [count, unread] = await Promise.all([
    prisma.todoRequest.count({ where }),
    prisma.todoRequest.count({ where: { ...where, status: "new", seen_at: null } }),
  ]);
  return { count, unread: unread > 0 };
}

export const visibleTodo = cache(async (slug: string) => {
  const list = await prisma.todoList.findUnique({
    where: { slug },
    include: {
      organisation: true,
      owner: { select: { name: true } },
      sections: { orderBy: { position: "asc" } },
      items: { where: { active: true }, orderBy: { position: "asc" } },
    },
  });
  if (!list || list.status === "archived") return null;
  if (list.status === "draft") {
    const session = await auth();
    if (session?.user?.id !== list.owner_id) return null;
  }
  return list;
});

export function brandColours(primary?: string, ink?: string) {
  if (!primary || !/^#[0-9a-f]{6}$/i.test(primary)) return undefined;
  const luminance = (colour: string) => {
    const rgb = [1, 3, 5].map((start) => {
      const part = parseInt(colour.slice(start, start + 2), 16) / 255;
      return part <= 0.04045 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4;
    });
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const background = luminance(primary);
  if (ink && /^#[0-9a-f]{6}$/i.test(ink)) {
    const foreground = luminance(ink);
    const contrast = (Math.max(background, foreground) + .05) / (Math.min(background, foreground) + .05);
    if (contrast >= 4.5) return { primary, ink };
  }
  return { primary, ink: background > .179 ? "#000000" : "#ffffff" };
}
