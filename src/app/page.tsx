import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getPublicAppName } from "@/lib/env";

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect("/home");

  const appName = getPublicAppName();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="font-semibold tracking-tight text-zinc-100">
            {appName}
          </span>
          <div className="flex gap-3">
            <Link
              href="/sign-in"
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-100"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 py-24 text-center">
        <div className="mb-4 inline-flex items-center rounded-full border border-violet-700/50 bg-violet-950/40 px-3 py-1 text-xs text-violet-300">
          ✦ AI-native IT governance — built for modern teams
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-zinc-50 sm:text-6xl">
          Requests, approvals &amp; change control
          <br />
          <span className="text-violet-400">without the ServiceNow bill</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
          {appName} replaces legacy ITSM ticketing with an AI-first platform.
          Submit IT requests in plain English, get risk-triaged automatically,
          and close change tickets with a full audit trail—in minutes, not days.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/sign-up"
            className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-violet-500"
          >
            Start for free →
          </Link>
          <Link
            href="/sign-in"
            className="rounded-xl border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300 hover:border-zinc-500"
          >
            Sign in to your workspace
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-5xl px-4 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "AI auto-triage",
              desc: "Every request is classified low / medium / high / critical by LLM — low-risk items auto-approve without human latency.",
              icon: "✦",
              color: "violet",
            },
            {
              title: "Structured catalog",
              desc: "Define request types with rich fields (text, select, date, number). The AI field helper fills forms from natural language input.",
              icon: "⬡",
              color: "teal",
            },
            {
              title: "Approval routing",
              desc: "Rule-based approval chains, email one-click approve/deny, and AI-recommended reviewers based on history.",
              icon: "⊕",
              color: "emerald",
            },
            {
              title: "Change control",
              desc: "Linear change-ticket pipeline with stages, assignees, and draft/review/approve workflow—all audited.",
              icon: "◈",
              color: "amber",
            },
            {
              title: "Full audit trail",
              desc: "Every action recorded. Export to CSV or PDF for compliance and security reviews.",
              icon: "◉",
              color: "zinc",
            },
            {
              title: "BYOK AI",
              desc: "Bring your own OpenAI/compatible key per organization. Isolated, encrypted at rest, never shared.",
              icon: "⬣",
              color: "blue",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <span className="text-xl">{f.icon}</span>
              <h3 className="mt-3 font-semibold text-zinc-100">{f.title}</h3>
              <p className="mt-2 text-sm text-zinc-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof - stats */}
      <section className="border-y border-zinc-800 bg-zinc-900/50 py-16">
        <div className="mx-auto grid max-w-3xl grid-cols-3 gap-8 px-4 text-center">
          {[
            { value: "< 30s", label: "Avg. time to triage" },
            { value: "100%", label: "Requests audited" },
            { value: "BYOK", label: "AI key isolation" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-violet-400">{s.value}</p>
              <p className="mt-1 text-sm text-zinc-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center">
        <h2 className="text-3xl font-bold text-zinc-50">
          Ready to replace your ticket queue?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-zinc-400">
          Set up in minutes. Works with your existing approvers, email, and
          webhooks. No consulting required.
        </p>
        <Link
          href="/sign-up"
          className="mt-8 inline-block rounded-xl bg-violet-600 px-8 py-3 font-semibold text-white hover:bg-violet-500"
        >
          Create a free workspace →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-4 py-8 text-center text-xs text-zinc-500">
        &copy; {new Date().getFullYear()} {appName} · Built for the AI era of IT
        governance
      </footer>
    </div>
  );
}
