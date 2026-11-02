"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HoldToConfirm } from "@/components/ui/hold-to-confirm";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { deleteGuest } from "@/lib/actions/guests";
import { toast } from "sonner";
import { Trash2, Search } from "lucide-react";

type Guest = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  rsvp: string | null;
  invited: boolean;
  checkedIn: boolean;
};

type Props = { eventId: string; guests: Guest[] };

const STATUS_FILTERS = ["all", "yes", "no", "maybe", "pending"] as const;
type Filter = (typeof STATUS_FILTERS)[number];

export function GuestTable({ eventId, guests }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const filtered = guests.filter((g) => {
    if (filter !== "all" && (g.rsvp ?? "pending") !== filter) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!g.name.toLowerCase().includes(q) && !g.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 p-4 border-b">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`px-3 h-8 rounded-md text-xs transition-colors duration-(--fast) ease-(--ease) motion-reduce:transition-none ${
                filter === f ? "bg-foreground text-background" : "hover:bg-muted"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="text-left px-4 py-3 font-medium">Guest</th>
              <th className="text-left px-4 py-3 font-medium">RSVP</th>
              <th className="text-left px-4 py-3 font-medium">Invite</th>
              <th className="text-left px-4 py-3 font-medium">Check-in</th>
              <th className="text-right px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-muted-foreground">
                  {guests.length === 0
                    ? "No guests yet. Add some above."
                    : "No guests match the current filter."}
                </td>
              </tr>
            ) : (
              filtered.map((g) => (
                <tr key={g.id} className="transition-colors duration-(--fast) ease-(--ease) hover:bg-muted/30 motion-reduce:transition-none">
                  <td className="px-4 py-3">
                    <div className="font-medium">{g.name}</div>
                    <div className="text-xs text-muted-foreground">{g.email}</div>
                    {g.phone && <div className="text-xs text-muted-foreground">{g.phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {g.rsvp ? <Badge variant={g.rsvp === "yes" ? "success" : g.rsvp === "maybe" ? "warning" : "secondary"}>{g.rsvp.charAt(0).toUpperCase() + g.rsvp.slice(1)}</Badge> : <Badge variant="secondary">Pending</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    {g.invited ? <Badge variant="success">Sent</Badge> : <Badge variant="secondary">Draft</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    {g.checkedIn ? <Badge variant="success">Checked in</Badge> : <Badge variant="secondary">Not yet</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <HoldToConfirm
                      label={`Hold to remove ${g.name}`}
                      icon={<Trash2 className="size-4" />}
                      className="w-auto whitespace-nowrap"
                      disabled={pending}
                      onConfirm={() => new Promise<void>((resolve, reject) => {
                        startTransition(async () => {
                          try {
                            await deleteGuest(eventId, g.id);
                            toast.success("Removed");
                            router.refresh();
                            resolve();
                          } catch (error) {
                            reject(error);
                          }
                        });
                      })}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 text-xs text-muted-foreground border-t">
        Showing {filtered.length} of {guests.length}
      </div>
    </div>
  );
}
