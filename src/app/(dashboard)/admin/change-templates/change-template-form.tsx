"use client";

import { useState } from "react";
import {
  adminCreateChangeTemplate,
  adminUpdateChangeTemplate,
} from "@/app/actions/admin";

type Mode = "create" | "edit";

export function ChangeTemplateForm(props: {
  mode: Mode;
  initial?: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    fieldSchema: unknown;
  };
}) {
  const [slug, setSlug] = useState(props.initial?.slug ?? "");
  const [title, setTitle] = useState(props.initial?.title ?? "");
  const [description, setDescription] = useState(
    props.initial?.description ?? "",
  );
  const [fieldSchemaJson, setFieldSchemaJson] = useState(
    props.initial
      ? JSON.stringify(props.initial.fieldSchema, null, 2)
      : '{\n  "fields": []\n}',
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="mt-3 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-950/50"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setPending(true);
        try {
          if (props.mode === "create") {
            await adminCreateChangeTemplate({
              slug,
              title,
              description: description || undefined,
              fieldSchemaJson,
            });
          } else if (props.initial) {
            await adminUpdateChangeTemplate({
              id: props.initial.id,
              slug,
              title,
              description: description || undefined,
              fieldSchemaJson,
            });
          }
          window.location.reload();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed");
          setPending(false);
        }
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label htmlFor="ct-slug" className="text-xs font-medium">
            Slug
          </label>
          <input
            id="ct-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            className="mt-0.5 w-full rounded border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            pattern="[a-z0-9_-]+"
          />
        </div>
        <div>
          <label htmlFor="ct-title" className="text-xs font-medium">
            Title
          </label>
          <input
            id="ct-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-0.5 w-full rounded border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
      </div>
      <div>
        <label htmlFor="ct-desc" className="text-xs font-medium">
          Description
        </label>
        <input
          id="ct-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-0.5 w-full rounded border border-zinc-200 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>
      <div>
        <label htmlFor="ct-fs" className="text-xs font-medium">
          field_schema (JSON)
        </label>
        <textarea
          id="ct-fs"
          required
          rows={8}
          value={fieldSchemaJson}
          onChange={(e) => setFieldSchemaJson(e.target.value)}
          className="mt-0.5 w-full rounded border border-zinc-200 bg-white px-2 py-1 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending
          ? "Saving…"
          : props.mode === "create"
            ? "Create template"
            : "Save"}
      </button>
    </form>
  );
}
