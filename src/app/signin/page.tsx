'use client';

import { useState } from "react";
import Link from "next/link";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { SpotlightCard } from "@/components/ui/reactbits/SpotlightCard";

const USERS_KEY = "syscraft.users";
const SESSION_KEY = "syscraft.session";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Email and password are required."); return; }
    try {
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
      const user = users.find((u: { email: string }) => u.email === email);
      if (!user) { setError("No account found with that email."); return; }
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      setDone(true);
    } catch {
      setError("Could not read account data.");
    }
  };

  return (
    <SiteChrome>
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
        <SpotlightCard className="w-full max-w-md p-8">
          <h1 className="text-2xl font-semibold text-zinc-100">Sign in</h1>
          <p className="mt-2 text-sm text-zinc-400">Welcome back to SysCraft.</p>
          {done ? (
            <div className="mt-6 rounded-lg border border-emerald-700/40 bg-emerald-950/30 p-4 text-sm text-emerald-200">
              Signed in. <Link href="/canvas" className="underline">Open the canvas →</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs text-zinc-400">Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-400">Password</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
              </label>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button type="submit" className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500">Sign in</button>
              <p className="text-center text-xs text-zinc-500">
                New here? <Link href="/signup" className="text-sky-400 hover:underline">Create an account</Link>
              </p>
            </form>
          )}
        </SpotlightCard>
      </div>
    </SiteChrome>
  );
}
