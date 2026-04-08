import { Suspense } from "react";
import { SignUpForm } from "./sign-up-form";

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
          Loading…
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}
