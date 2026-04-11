import type { TriageRisk } from "@/server/ai/triage";

const variantMap: Record<
  TriageRisk,
  { label: string; className: string }
> = {
  low: {
    label: "Low risk",
    className:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  medium: {
    label: "Medium risk",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  high: {
    label: "High risk",
    className:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  },
  critical: {
    label: "Critical risk",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  },
};

export function TriageBadge({
  risk,
  reason,
}: {
  risk: string;
  reason?: string | null;
}) {
  const variant = variantMap[risk as TriageRisk];
  if (!variant) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={reason ?? undefined}
    >
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${variant.className}`}
      >
        ✦ {variant.label}
      </span>
      {reason && (
        <span className="max-w-xs truncate text-xs text-zinc-500 dark:text-zinc-400">
          {reason}
        </span>
      )}
    </span>
  );
}
