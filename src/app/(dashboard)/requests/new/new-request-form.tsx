"use client";

import Link from "next/link";
import { useEffect, useMemo, useId, useState } from "react";
import { suggestRequestPayloadAction } from "@/app/actions/ai-request-helper";
import { createRequestAction } from "@/app/actions/requests";
import {
  parseFieldSchema,
  type FieldSchemaJson,
} from "@/lib/request-schemas";

export type RequestTypeOption = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  fieldSchema: unknown;
  riskDefaults: unknown;
};

function resolveInitialTypeId(
  types: RequestTypeOption[],
  initialTypeId: string | null | undefined,
): string {
  if (initialTypeId && types.some((t) => t.id === initialTypeId)) {
    return initialTypeId;
  }
  return types[0]?.id ?? "";
}

function emptyValuesForSchema(schema: FieldSchemaJson | null): Record<string, string> {
  if (!schema) return {};
  return Object.fromEntries(schema.fields.map((f) => [f.key, ""]));
}

export function NewRequestForm({
  types,
  initialTypeId = null,
}: {
  types: RequestTypeOption[];
  initialTypeId?: string | null;
}) {
  const lockedFromUrl =
    Boolean(initialTypeId) && types.some((t) => t.id === initialTypeId);
  const [typeId, setTypeId] = useState(() =>
    resolveInitialTypeId(types, initialTypeId),
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [suggestHint, setSuggestHint] = useState("");
  const [suggestMsg, setSuggestMsg] = useState<string | null>(null);
  const [suggestPending, setSuggestPending] = useState(false);

  const selected = types.find((t) => t.id === typeId) ?? types[0];
  const schema = useMemo((): FieldSchemaJson | null => {
    if (!selected) return null;
    try {
      return parseFieldSchema(selected.fieldSchema);
    } catch {
      return null;
    }
  }, [selected]);

  useEffect(() => {
    setFieldValues(emptyValuesForSchema(schema));
    setSuggestMsg(null);
  }, [typeId, schema]);

  const risk = selected?.riskDefaults as Record<string, unknown> | null;
  const formId = useId();
  const submitErrorId = `${formId}-submit-error`;
  const suggestStatusId = `${formId}-suggest-status`;
  const formDescribedBy =
    [submitError && submitErrorId, suggestMsg && suggestStatusId]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New request</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {lockedFromUrl
            ? "We prefilled the request type from the catalog. Add the details only you know; everything else is wired for audit and policy."
            : "Choose an intent and fill structured fields. Submission creates an auditable record."}
        </p>
      </div>
      {!selected || !schema ? (
        <p className="text-red-600">Invalid catalog configuration.</p>
      ) : (
        <form
          className="grid gap-6 lg:grid-cols-2"
          aria-describedby={formDescribedBy}
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitError(null);
            const payload: Record<string, unknown> = { ...fieldValues };
            setPending(true);
            try {
              const res = await createRequestAction({
                requestTypeId: typeId,
                payload,
              });
              if (!res.ok) {
                setSubmitError(
                  "policyDenied" in res
                    ? (res.policyDenied ?? "Policy denied")
                    : "Validation failed — check required fields.",
                );
                setPending(false);
                return;
              }
              window.location.href = `/requests/${res.requestId}`;
            } catch (err) {
              setSubmitError(
                err instanceof Error ? err.message : "Something went wrong",
              );
              setPending(false);
            }
          }}
        >
          <fieldset className="min-w-0 space-y-3.5 border-0 p-0">
            <legend className="sr-only">Request details</legend>
            <div>
              {lockedFromUrl ? (
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Intent
                </div>
              ) : (
                <label
                  htmlFor={`${formId}-intent`}
                  className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
                >
                  Intent
                </label>
              )}
              {lockedFromUrl ? (
                <div className="mt-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/80">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {selected.title}
                  </span>
                  <Link
                    href="/requests/new"
                    className="ml-2 text-xs font-medium text-zinc-600 underline dark:text-zinc-400"
                  >
                    Change type
                  </Link>
                </div>
              ) : (
                <select
                  id={`${formId}-intent`}
                  name="requestTypeId"
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  aria-invalid={Boolean(submitError)}
                  aria-describedby={submitError ? submitErrorId : undefined}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                >
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              )}
              {selected.description && (
                <p className="mt-1 text-xs text-zinc-500">{selected.description}</p>
              )}
            </div>

            <div
              className="rounded-lg border border-teal-200/80 bg-teal-50/60 p-2.5 dark:border-teal-900/40 dark:bg-teal-950/25"
              aria-labelledby={`${formId}-ai-helper-title`}
            >
              <p
                id={`${formId}-ai-helper-title`}
                className="text-xs font-medium text-teal-950 dark:text-teal-100"
              >
                AI field helper
              </p>
              <p
                id={`${formId}-ai-helper-desc`}
                className="mt-1 text-xs text-teal-900/85 dark:text-teal-200/80"
              >
                Describe what you need in plain language; we suggest values you
                can edit before submit. Requires Admin → AI (or platform key).
              </p>
              <textarea
                id={`${formId}-suggest-hint`}
                value={suggestHint}
                onChange={(e) => setSuggestHint(e.target.value)}
                rows={2}
                placeholder="e.g. Need read-only access to the sales Snowflake mart for Q2 board deck, 30 days"
                aria-describedby={`${formId}-ai-helper-desc`}
                className="mt-2 w-full rounded-lg border border-teal-200/80 bg-white px-2 py-1.5 text-sm dark:border-teal-900/50 dark:bg-zinc-950"
              />
              <button
                type="button"
                disabled={suggestPending || !suggestHint.trim()}
                onClick={async () => {
                  setSuggestMsg(null);
                  setSuggestPending(true);
                  try {
                    const r = await suggestRequestPayloadAction({
                      requestTypeId: typeId,
                      hint: suggestHint,
                    });
                    if (r.ok) {
                      setFieldValues((prev) => ({ ...prev, ...r.values }));
                      setSuggestMsg(
                        r.usedPlatformFallback
                          ? "Applied suggestions (platform AI key)."
                          : "Applied suggestions — review and edit before submit.",
                      );
                    } else {
                      setSuggestMsg(r.error);
                    }
                  } finally {
                    setSuggestPending(false);
                  }
                }}
                className="mt-2 rounded-lg bg-teal-800 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-teal-700"
              >
                {suggestPending ? "Suggesting…" : "Suggest fields"}
              </button>
              <div
                id={suggestStatusId}
                className="mt-2 min-h-[1.25rem] text-xs text-teal-900 dark:text-teal-200/90"
                role="status"
                aria-live="polite"
              >
                {suggestMsg ?? ""}
              </div>
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
                    value={fieldValues[f.key] ?? ""}
                    onChange={(e) =>
                      setFieldValues((p) => ({
                        ...p,
                        [f.key]: e.target.value,
                      }))
                    }
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
                    value={fieldValues[f.key] ?? ""}
                    onChange={(e) =>
                      setFieldValues((p) => ({
                        ...p,
                        [f.key]: e.target.value,
                      }))
                    }
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
              {pending ? "Submitting…" : "Submit request"}
            </button>
          </fieldset>
          <aside className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Preview
            </h2>
            <dl className="mt-4 space-y-3">
              {risk &&
                Object.entries(risk).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-zinc-500">{k}</dt>
                    <dd className="mt-0.5 text-zinc-800 dark:text-zinc-200">
                      {String(v)}
                    </dd>
                  </div>
                ))}
              {!risk && (
                <p className="text-zinc-500">No risk preview configured.</p>
              )}
              <div>
                <dt className="text-xs text-zinc-500">Policy</dt>
                <dd className="mt-0.5 text-zinc-600 dark:text-zinc-400">
                  Validated on submit when{" "}
                  <code className="text-xs">POLICY_ENGINE_URL</code> is set.
                </dd>
              </div>
            </dl>
          </aside>
        </form>
      )}
    </div>
  );
}
