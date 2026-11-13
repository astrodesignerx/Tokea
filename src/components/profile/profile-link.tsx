import Link from "next/link";
import { Avatar, type ProfileUser } from "./avatar";

export function ProfileLink({ user }: { user: ProfileUser }) {
  return (
    <Link
      href="/dashboard/profile"
      aria-label="Your profile"
      className="group relative inline-flex shrink-0 rounded-full p-1 focus-visible:outline-none"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 scale-90 rounded-full opacity-0 ring-2 ring-brand transition-[opacity,transform] duration-(--fast) ease-(--ease) group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
      />
      <Avatar user={user} />
    </Link>
  );
}
