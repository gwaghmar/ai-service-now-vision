import { db } from "@/db";
import { appCatalog } from "@/db/app-schema";
import { requireSession } from "@/lib/session";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { ExternalLink, ShieldAlert, Cpu } from "lucide-react";

export const metadata = {
  title: "App Catalog",
};

export default async function CatalogPage() {
  const session = await requireSession();
  const orgId = session.user.organizationId!;

  const apps = await db.select().from(appCatalog).where(eq(appCatalog.organizationId, orgId));

  return (
    <div className="flex-1 overflow-y-auto bg-stone-50/50 p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
            Application Catalog
          </h1>
          <p className="mt-2 text-stone-500">
            Browse and request access to standard enterprise tools and targeted AI products.
          </p>
        </header>

        {apps.length === 0 ? (
          <div className="rounded-xl border border-stone-200 bg-white p-12 text-center">
            <Cpu className="mx-auto h-12 w-12 text-stone-300" />
            <h3 className="mt-4 text-sm font-semibold text-stone-900">No Apps Configured</h3>
            <p className="mt-1 text-sm text-stone-500">
              The platform administrator needs to seed the app catalog via scripts/seed-app-catalog.ts.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {apps.map((app) => (
              <div
                key={app.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                      {app.category}
                    </span>
                    {app.telemetrySupport === "full_cost" && (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-700/10">
                        Cost Monitored
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-stone-900">
                    {app.appName}
                  </h3>
                  <p className="mt-1 text-sm text-stone-500">
                    Vendor: <span className="font-medium text-stone-700">{app.vendor}</span>
                  </p>
                  
                  {app.knownLimits && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>{app.knownLimits}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between gap-4 border-t border-stone-100 pt-4">
                  {app.setupGuideUrl ? (
                    <a
                      href={app.setupGuideUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                    >
                      Knowledge Base
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <span className="text-sm font-medium text-stone-400">No Docs</span>
                  )}

                  <Link
                    href={`/requests/new?app=${encodeURIComponent(app.appName)}`}
                    className="inline-flex items-center justify-center rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-950"
                  >
                    Request Access
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
