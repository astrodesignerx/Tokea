import type { Activity } from "@/lib/checklists/types";

export function ActivityFeed({ activity }: { activity: Activity[] }) {
  return <section className="space-y-4 border-t pt-5" aria-label="Recent activity">
    <h2 className="nf-eyebrow">Recent activity</h2>
    {activity.length ? <ol className="space-y-4">{activity.map((row) => <li key={row.id} className="qr-fade break-words text-xs leading-relaxed">
      <p><strong>{row.actor.name || row.actor.email}</strong> {row.action}{row.item_title ? ` "${row.item_title}"` : " the list"}.</p>
      <time className="text-muted-foreground" dateTime={row.created_at}>{new Date(row.created_at).toLocaleString("en-GB", { timeZone: "Africa/Nairobi", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} (Nairobi)</time>
    </li>)}</ol> : <p className="text-xs text-muted-foreground">Activity will appear here as people work on this list.</p>}
  </section>;
}
