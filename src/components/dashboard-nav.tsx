"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Role = "requester" | "approver" | "admin";

type NavItem = {
  href: string;
  label: string;
};

const baseItems: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/requests/new", label: "New request" },
  { href: "/changes", label: "Change releases" },
  { href: "/changes/new", label: "New change" },
];

const approverItems: NavItem[] = [{ href: "/approvals", label: "Approvals" }];

const adminItems: NavItem[] = [
  { href: "/admin/types", label: "Catalog" },
  { href: "/admin/change-templates", label: "Change templates" },
  { href: "/admin/routing", label: "Routing" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/ai", label: "AI" },
  { href: "/admin/api-keys", label: "API keys" },
  { href: "/admin/setup-status", label: "Setup status" },
  { href: "/admin/audit-export", label: "Audit export" },
  { href: "/admin/integrations", label: "Integrations" },
];

function matchesPath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ href, label }: NavItem) {
  const pathname = usePathname();
  const active = matchesPath(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-2 py-1 transition-colors ${
        active
          ? "bg-zinc-200/70 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      }`}
    >
      {label}
    </Link>
  );
}

export function DashboardNav({ role }: { role: Role }) {
  return (
    <nav aria-label="Primary" className="flex flex-wrap items-center gap-1 text-sm">
      {baseItems.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
      {(role === "approver" || role === "admin") &&
        approverItems.map((item) => <NavLink key={item.href} {...item} />)}
      {role === "admin" && (
        <details className="relative">
          <summary
            aria-label="Open admin navigation links"
            className="cursor-pointer list-none rounded-md px-2 py-1 text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Admin
          </summary>
          <div className="absolute left-0 top-8 z-20 w-52 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {adminItems.map((item) => (
              <div key={item.href}>
                <NavLink {...item} />
              </div>
            ))}
          </div>
        </details>
      )}
    </nav>
  );
}
