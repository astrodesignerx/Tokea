"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { updateProfile, type ProfileState } from "@/lib/actions/profile";
import { useModalDialog } from "@/components/profile/use-modal-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type ProfileEditValues = {
  name: string | null;
  job_title: string | null;
  phone: string | null;
  bio: string | null;
  default_organisation_id: string | null;
};

export type OrganisationOption = {
  id: string;
  name: string;
};

export function ProfileEditSheet({
  initial,
  organisations,
}: {
  initial: ProfileEditValues;
  organisations: OrganisationOption[];
}) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { rendered, shown, openDialog, closeDialog, panelRef } =
    useModalDialog(triggerRef);

  const [state, setState] = useState<ProfileState>({ error: null });
  const [bioLength, setBioLength] = useState((initial.bio ?? "").length);
  const [formKey, setFormKey] = useState(0);
  const [pending, startTransition] = useTransition();

  function handleOpen() {
    setState({ error: null });
    setBioLength((initial.bio ?? "").length);
    setFormKey((n) => n + 1);
    openDialog();
  }

  function handleClose() {
    if (pending) return;
    closeDialog();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateProfile(formData);
      setState(result);
      if (!result.error) {
        toast.success("Profile saved");
        closeDialog();
        router.refresh();
      }
    });
  }

  const fieldErrors = state.fieldErrors ?? {};

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpen}
      >
        <Pencil className="size-3.5" /> Edit profile
      </Button>

      {rendered ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-edit-title"
          className="fixed inset-0 z-50"
        >
          <div
            data-open={shown ? "true" : "false"}
            onClick={handleClose}
            aria-hidden="true"
            className="fixed inset-0 bg-black/60 opacity-0 transition-opacity duration-[220ms] ease-(--ease) data-[open=true]:opacity-100 motion-reduce:transition-none"
          />

          <div
            ref={panelRef}
            tabIndex={-1}
            data-open={shown ? "true" : "false"}
            className="fixed inset-x-0 bottom-0 z-10 flex max-h-[90dvh] flex-col rounded-t-xl border-t bg-card opacity-0 translate-y-6 shadow-xl transition-[opacity,transform] duration-[220ms] ease-(--ease) data-[open=true]:translate-y-0 data-[open=true]:opacity-100 motion-reduce:transition-none sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:max-h-none sm:w-full sm:max-w-md sm:translate-y-0 sm:translate-x-8 sm:rounded-none sm:rounded-l-xl sm:border-l sm:border-t-0 sm:data-[open=true]:translate-x-0"
          >
            <div className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6">
              <div>
                <h2
                  id="profile-edit-title"
                  className="font-display text-lg font-medium tracking-tight"
                >
                  Edit profile
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Your details across NikoForm.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClose}
                disabled={pending}
                aria-label="Close edit profile panel"
              >
                <X className="size-4" />
              </Button>
            </div>

            <form
              key={formKey}
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    autoComplete="name"
                    defaultValue={initial.name ?? ""}
                    maxLength={80}
                    aria-invalid={Boolean(fieldErrors.name)}
                    aria-describedby={fieldErrors.name ? "edit-name-error" : undefined}
                  />
                  {fieldErrors.name ? (
                    <p
                      id="edit-name-error"
                      role="alert"
                      className="qr-fade text-xs text-destructive"
                    >
                      {fieldErrors.name}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-job-title">Job title</Label>
                  <Input
                    id="edit-job-title"
                    name="job_title"
                    autoComplete="organization-title"
                    placeholder="e.g. Designer"
                    defaultValue={initial.job_title ?? ""}
                    maxLength={80}
                    aria-invalid={Boolean(fieldErrors.job_title)}
                    aria-describedby={
                      fieldErrors.job_title ? "edit-job-title-error" : undefined
                    }
                  />
                  {fieldErrors.job_title ? (
                    <p
                      id="edit-job-title-error"
                      role="alert"
                      className="qr-fade text-xs text-destructive"
                    >
                      {fieldErrors.job_title}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-company">Default company</Label>
                  <Select
                    id="edit-company"
                    name="default_organisation_id"
                    defaultValue={initial.default_organisation_id ?? ""}
                    aria-invalid={Boolean(fieldErrors.default_organisation_id)}
                    aria-describedby={
                      fieldErrors.default_organisation_id
                        ? "edit-company-error"
                        : undefined
                    }
                  >
                    <option value="">None</option>
                    {organisations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </Select>
                  {fieldErrors.default_organisation_id ? (
                    <p
                      id="edit-company-error"
                      role="alert"
                      className="qr-fade text-xs text-destructive"
                    >
                      {fieldErrors.default_organisation_id}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+254 700 000 000"
                    defaultValue={initial.phone ?? ""}
                    maxLength={30}
                    aria-invalid={Boolean(fieldErrors.phone)}
                    aria-describedby={
                      fieldErrors.phone ? "edit-phone-error" : undefined
                    }
                  />
                  {fieldErrors.phone ? (
                    <p
                      id="edit-phone-error"
                      role="alert"
                      className="qr-fade text-xs text-destructive"
                    >
                      {fieldErrors.phone}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="edit-bio">Bio</Label>
                    <span
                      className="font-mono text-[11px] tabular-nums text-muted-foreground"
                      aria-live="polite"
                    >
                      {bioLength}/280
                    </span>
                  </div>
                  <Textarea
                    id="edit-bio"
                    name="bio"
                    rows={4}
                    placeholder="A short line about what you do."
                    defaultValue={initial.bio ?? ""}
                    maxLength={280}
                    onChange={(event) => setBioLength(event.target.value.length)}
                    aria-invalid={Boolean(fieldErrors.bio)}
                    aria-describedby={fieldErrors.bio ? "edit-bio-error" : undefined}
                  />
                  {fieldErrors.bio ? (
                    <p
                      id="edit-bio-error"
                      role="alert"
                      className="qr-fade text-xs text-destructive"
                    >
                      {fieldErrors.bio}
                    </p>
                  ) : null}
                </div>

                {state.error && Object.keys(fieldErrors).length === 0 ? (
                  <p role="alert" className="qr-fade text-sm text-destructive">
                    {state.error}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center justify-end gap-2 border-t px-5 py-4 sm:px-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
