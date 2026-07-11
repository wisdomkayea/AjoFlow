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

const ROLES = [
  { value: "ADMIN", label: "Group admin", hint: "I run an Ajo/Esusu group" },
  { value: "MEMBER", label: "Member", hint: "I contribute to a group" },
  { value: "VENDOR", label: "Vendor", hint: "I sell on installments" },
  { value: "CUSTOMER", label: "Customer", hint: "I'm paying for something in installments" }
];

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "ADMIN" });
  const [loading, setLoading] = useState(false);
  const { success, presentError } = useNotifier();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await apiFetch<{ user: { role: Role } }>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(form)
      });

      try {
        const supabase = createClient();
        await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              name: form.name,
              role: form.role
            }
          }
        });
      } catch {
        // The local account is already created by the API route; Supabase is an optional companion session.
      }

      success("Account created successfully.");
      router.push(roleHomePath(result.user.role));
      router.refresh();
    } catch (err) {
      presentError(err, "Could not create your account");
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
          <h1 className="font-display text-2xl">Create your account</h1>
          <p className="mt-1 text-sm text-ink/50">Set up in under a minute.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
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
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <p className="block text-xs font-medium tracking-wide text-ink/50 mb-1.5">I am a…</p>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    type="button"
                    key={r.value}
                    onClick={() => setForm({ ...form, role: r.value })}
                    className={`rounded-md border px-3 py-2 text-left text-xs leading-relaxed transition-colors ${
                      form.role === r.value
                        ? "border-forest-500 bg-forest-50 text-forest-700"
                        : "border-line text-ink/60 hover:border-forest-300"
                    }`}
                  >
                    <span className="block font-medium">{r.label}</span>
                    <span className="block text-[11px] opacity-70">{r.hint}</span>
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-ink/50">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-forest-700">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
