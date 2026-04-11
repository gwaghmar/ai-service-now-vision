import { adminListPendingInvites } from "@/app/actions/ai-org";
import { requireRole } from "@/lib/session";
import { InviteForm } from "./invite-form";

export default async function AdminInvitesPage() {
  await requireRole(["admin"]);
  const invites = await adminListPendingInvites();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invites</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Invite team members to join your organization. Invite links expire after 14 days.
        </p>
      </div>

      <InviteForm />

      <section>
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Pending invites ({invites.length})
        </h2>
        {invites.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No pending invites.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-sm font-medium">{inv.email}</div>
                  <div className="text-xs text-zinc-400">
                    Role: {inv.role ?? "requester"} ·{" "}
                    Expires:{" "}
                    {new Date(inv.expiresAt!).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  Pending
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
