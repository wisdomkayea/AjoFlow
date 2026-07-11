"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Landmark } from "lucide-react";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useNotifier } from "@/components/ui/ToastNotification";
import { apiFetch } from "@/lib/api-client";
import { createClient } from "@/lib/client";
import { roleHomePath } from "@/lib/role-routes";
import type { Role } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { success, presentError } = useNotifier();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await apiFetch<{ user: { role: Role } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(form)
      });

      try {
        const supabase = createClient();
        await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password
        });
      } catch {
        // Keep the existing JWT-based login working even if Supabase auth is not configured for this user.
      }

      success("Login successful. Welcome back.");
      router.push(roleHomePath(result.user.role));
      router.refresh();
    } catch (err) {
      presentError(err, "Could not log you in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
          <Link href="/">
            <div className="mb-8 flex items-center justify-center gap-2">
            <Landmark className="h-5 w-5 text-forest-600" />
            <span className="font-display italic text-xl">AjoFlow</span>
            </div>  
          </Link>
          
      
        <Card className="p-5 sm:p-6">
          <h1 className="font-display text-2xl">Welcome back</h1>
          <p className="mt-1 text-sm text-ink/50">Log in to your workspace.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in…" : "Log in"}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-ink/50">
          New to AjoFlow?{" "}
          <Link href="/signup" className="font-medium text-forest-700">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
