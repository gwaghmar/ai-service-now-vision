"use client";

import Link from "next/link";
import { useMemo, useId, useState } from "react";
import { createChangeTicketAction } from "@/app/actions/change-tickets";
import {
  parseFieldSchema,
  type FieldSchemaJson,
} from "@/lib/request-schemas";

export type ChangeTemplateOption = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  fieldSchema: unknown;
};

export type OrgMemberOption = {
  id: string;
  email: string;
  name: string;
};

export function NewChangeForm({
  templates,
  members,
}: {
  templates: ChangeTemplateOption[];
  members: OrgMemberOption[];
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selected = templates.find((t) => t.id === templateId) ?? templates[0];
  const schema = useMemo((): FieldSchemaJson | null => {
    if (!selected) return null;
    try {
      return parseFieldSchema(selected.fieldSchema);
    } catch {
      return null;
    }
  }, [selected]);

  const formId = useId();
  const submitErrorId = `${formId}-submit-error`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New change ticket</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          File a governed change (reports, ETL, releases). Starts in{" "}
          <strong>Draft</strong>; move to <strong>On deck</strong> when ready for
          UAT gates.
        </p>
      </div>
      {!selected || !schema ? (
        <p className="text-red-600">
          No change templates yet. Ask an admin to add some under{" "}
          <Link href="/admin/change-templates" className="underline">
            Change templates
          </Link>
          .
        </p>
      ) : (
        <form
          className="grid gap-6 lg:grid-cols-2"
          aria-describedby={submitError ? submitErrorId : undefined}
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitError(null);
            const fd = new FormData(e.currentTarget);
            const tplIdFromForm = String(fd.get("changeTemplateId") ?? "").trim();
            const tpl =
              templates.find((t) => t.id === tplIdFromForm) ?? templates[0];
            if (!tpl) {
              setSubmitError("Pick a template.");
              return;
            }
            let schemaFromForm: FieldSchemaJson;
            try {
              schemaFromForm = parseFieldSchema(tpl.fieldSchema);
            } catch {
              setSubmitError("Invalid template configuration.");
              return;
            }
            const payload: Record<string, unknown> = {};
            for (const f of schemaFromForm.fields) {
              payload[f.key] = fd.get(f.key) ?? "";
            }
            const titleVal =
              String(fd.get("title") ?? "").trim() || "Change";
            const assigneeRaw = String(fd.get("assignedUserId") ?? "").trim();
            const assignee =
              assigneeRaw !== "" ? assigneeRaw : undefined;
            setPending(true);
            try {
              const res = await createChangeTicketAction({
                changeTemplateId: tpl.id,
                title: titleVal,
                payload,
                assignedUserId: assignee,
              });
              if (!res.ok) {
                setSubmitError("Validation failed — check required fields.");
                setPending(false);
                return;
              }
              window.location.href = `/changes/${res.ticketId}`;
            } catch (err) {
              setSubmitError(
                err instanceof Error ? err.message : "Something went wrong",
              );
              setPending(false);
            }
          }}
        >
          <fieldset className="min-w-0 space-y-3.5 border-0 p-0">
            <legend className="sr-only">Change ticket details</legend>
            <div>
              <label
                htmlFor={`${formId}-template`}
                className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
              >
                Template
              </label>
              <select
                id={`${formId}-template`}
                name="changeTemplateId"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                aria-invalid={Boolean(submitError)}
                aria-describedby={submitError ? submitErrorId : undefined}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              {selected.description && (
                <p className="mt-1 text-xs text-zinc-500">{selected.description}</p>
              )}
            </div>
            <div>
              <label
                htmlFor={`${formId}-title`}
                className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
              >
                Short title *
              </label>
              <input
                id={`${formId}-title`}
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={500}
                placeholder="e.g. AP aging report — vendor dimension"
                aria-invalid={Boolean(submitError)}
                aria-describedby={submitError ? submitErrorId : undefined}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </div>
            <div>
              <label
                htmlFor="assignedUserId"
                className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
              >
                Assign to
              </label>
              <select
                id="assignedUserId"
                name="assignedUserId"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                aria-invalid={Boolean(submitError)}
                aria-describedby={submitError ? submitErrorId : undefined}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="">— Unassigned —</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.email} ({m.email})
                  </option>
                ))}
              </select>
            </div>
            {schema.fields.map((f) => (
              <div key={f.key}>
                <label
                  htmlFor={`${formId}-field-${f.key}`}
                  className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
                >
                  {f.label}
                  {f.required !== false ? " *" : ""}
                </label>
                {f.type === "textarea" ? (
                  <textarea
                    id={`${formId}-field-${f.key}`}
                    name={f.key}
                    required={f.required !== false}
                    rows={4}
                    placeholder={f.placeholder}
                    aria-invalid={Boolean(submitError)}
                    aria-describedby={submitError ? submitErrorId : undefined}
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  />
                ) : (
                  <input
                    id={`${formId}-field-${f.key}`}
                    name={f.key}
                    required={f.required !== false}
                    placeholder={f.placeholder}
                    aria-invalid={Boolean(submitError)}
                    aria-describedby={submitError ? submitErrorId : undefined}
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  />
                )}
              </div>
            ))}
            {submitError && (
              <p id={submitErrorId} className="text-sm text-red-600" role="alert">
                {submitError}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              aria-busy={pending}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {pending ? "Creating…" : "Create draft"}
            </button>
          </fieldset>
        </form>
      )}
    </div>
  );
}
