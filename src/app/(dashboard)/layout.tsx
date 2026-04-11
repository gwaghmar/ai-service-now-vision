import Link from "next/link";
import { Suspense } from "react";
import { DashboardNav } from "@/components/dashboard-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { RequestsHubSearch } from "@/components/requests-hub-search";
import { ToastProvider } from "@/components/toast";
import { getPublicAppName } from "@/lib/env";
import { requireSession } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession();

  const role = session.user.role;
  const appName = getPublicAppName();

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <header className="sticky top-0 z-10 border-b border-zinc-200/80 bg-white/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/home" className="font-semibold tracking-tight">
              {appName}
            </Link>
            <DashboardNav role={role} />
            <Suspense fallback={null}>
              <RequestsHubSearch />
            </Suspense>
            <div className="ml-auto flex items-center gap-3 text-sm text-zinc-500">
              <Link
                href="/profile"
                className="truncate max-w-[12rem] hover:underline sm:max-w-xs"
                aria-label="Your profile settings"
              >
                {session.user.email}
              </Link>
              <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs dark:border-zinc-700">
                {role}
              </span>
              <SignOutButton />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
      </div>
    </ToastProvider>
  );
}
