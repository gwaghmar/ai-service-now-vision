import { requireSession } from "@/lib/session";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const session = await requireSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Account settings</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Manage your display name and password.
        </p>
      </div>
      <ProfileForm
        initialName={session.user.name ?? ""}
        email={session.user.email}
      />
    </div>
  );
}
