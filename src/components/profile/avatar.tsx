import Image from "next/image";
import { cn } from "@/lib/utils";

export type ProfileUser = {
  name: string | null;
  email: string;
  image: string | null;
};

export function getInitials(user: Pick<ProfileUser, "name" | "email">): string {
  const name = user.name?.trim();
  const words = name ? name.split(/\s+/) : [];
  return (
    words.length
      ? [words[0], ...(words.length > 1 ? [words[words.length - 1]] : [])]
      : [user.email]
  )
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toLocaleUpperCase();
}

const SIZE_CLASSES = {
  sm: "size-8 text-xs",
  lg: "size-[72px] text-2xl",
  xl: "size-24 text-3xl",
} as const;

const SIZE_PIXELS = {
  sm: 32,
  lg: 72,
  xl: 96,
} as const;

export function Avatar({
  user,
  size = "sm",
  className,
}: {
  user: ProfileUser;
  size?: "sm" | "lg" | "xl";
  className?: string;
}) {
  const name = user.name?.trim();
  const initials = getInitials(user);
  const pixels = SIZE_PIXELS[size];

  return (
    <span
      role="img"
      aria-label={name || user.email}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand/15 font-medium text-brand",
        SIZE_CLASSES[size],
        className,
      )}
    >
      <span aria-hidden="true">{initials}</span>
      {user.image ? (
        <Image
          src={user.image}
          alt=""
          width={pixels}
          height={pixels}
          unoptimized
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
    </span>
  );
}
