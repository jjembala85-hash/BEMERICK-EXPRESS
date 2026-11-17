import type { Metadata } from "next";
import Link from "next/link";
import { CodeForm } from "./code-form";

export const metadata: Metadata = { title: "Sign-in code", robots: { index: false, follow: false } };

export default function SignInCodePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-brand px-4 py-10">
      <div className="w-full max-w-sm rounded-xl bg-surface p-7 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bx-mark.svg" alt="" width={40} height={40} />
          <div>
            <p className="font-serif text-xl font-bold leading-tight text-ink">BX Newsroom</p>
            <p className="text-sm text-slate">Two-step sign-in</p>
          </div>
        </div>
        <p className="mb-5 text-sm text-slate">
          Your password was right. Open your authenticator app and type the code shown for <span className="font-semibold text-ink">BX Newsroom</span>.
        </p>
        <CodeForm />
        <p className="mt-5 text-xs text-slate">
          No phone and no backup codes? Ask an administrator to reset your two-step sign-in.{" "}
          <Link href="/newsroom/login" className="font-semibold text-lake-ink hover:underline">Start again</Link>
        </p>
      </div>
    </main>
  );
}
