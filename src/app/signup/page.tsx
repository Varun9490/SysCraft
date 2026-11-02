'use client';

import { useState } from "react";
import Link from "next/link";
import { SiteChrome } from "@/components/nav/SiteChrome";
import { SpotlightCard } from "@/components/ui/reactbits/SpotlightCard";

const USERS_KEY = "syscraft.users";
const SESSION_KEY = "syscraft.session";

interface User { email: string; name: string; createdAt: string; plan: "free" | "pro" | "team"; }

function loadUsers(): User[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); } catch { return []; }
}

function saveUsers(u: User[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_KEY, JSON.stringify(u));
}

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password || !name) { setError("All fields are required."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    const users = loadUsers();
    if (users.some((u) => u.email === email)) { setError("An account with that email already exists."); return; }
    const user: User = { email, name, createdAt: new Date().toISOString(), plan: "free" };
    saveUsers([...users, user]);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setDone(true);
  };

  return (
    <SiteChrome>
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
        <SpotlightCard className="w-full max-w-md p-8">
          <h1 className="text-2xl font-semibold text-zinc-100">Create your account</h1>
          <p className="mt-2 text-sm text-zinc-400">Free forever for 3 canvases. Upgrade anytime.</p>
          {done ? (
            <div className="mt-6 rounded-lg border border-emerald-700/40 bg-emerald-950/30 p-4 text-sm text-emerald-200">
              Account created. <Link href="/canvas" className="underline">Open the canvas →</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs text-zinc-400">Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-400">Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
              </label>
              <label className="block">
                <span className="text-xs text-zinc-400">Password</span>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
              </label>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button type="submit" className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500">Create account</button>
              <p className="text-center text-xs text-zinc-500">
                Already have an account? <Link href="/signin" className="text-sky-400 hover:underline">Sign in</Link>
              </p>
            </form>
          )}
        </SpotlightCard>
      </div>
    </SiteChrome>
  );
}
