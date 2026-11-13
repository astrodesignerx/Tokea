import Image from "next/image";
import { cn } from "@/lib/utils";

export type ProfileUser = {
  name: string | null;
  email: string;
  image: string | null;
};

export function Avatar({ user, size = "sm" }: { user: ProfileUser; size?: "sm" | "lg" }) {
  const name = user.name?.trim();
  const words = name ? name.split(/\s+/) : [];
  const initials = (words.length
    ? [words[0], ...(words.length > 1 ? [words[words.length - 1]] : [])]
    : [user.email]
  ).map((word) => Array.from(word)[0] ?? "").join("").toLocaleUpperCase();
  const pixels = size === "sm" ? 32 : 72;

  return (
    <span
      role="img"
      aria-label={name || user.email}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand/15 font-medium text-brand",
        size === "sm" ? "size-8 text-xs" : "size-[72px] text-2xl",
      )}
    >
      {user.image ? (
        <Image src={user.image} alt="" width={pixels} height={pixels} unoptimized className="size-full object-cover" />
      ) : initials}
    </span>
  );
}
