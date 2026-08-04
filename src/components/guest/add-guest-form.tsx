"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addGuest } from "@/lib/actions/guests";
import { toast } from "sonner";

type Props = { eventId: string };

export function AddGuestForm({ eventId }: Props) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  function reset() {
    setName("");
    setEmail("");
    setPhone("");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await addGuest(eventId, { name, email, phone });
        toast.success(`Added ${name}`);
        reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not add guest");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="g-name">Name</Label>
        <Input id="g-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="g-email">Email</Label>
        <Input id="g-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="g-phone">Phone (optional)</Label>
        <Input id="g-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add guest"}
      </Button>
    </form>
  );
}
