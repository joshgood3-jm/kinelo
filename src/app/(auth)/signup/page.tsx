"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/home");
      router.refresh();
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            🎬 Cinematch
          </Link>
          <p className="text-muted-foreground mt-2">Start ranking movies</p>
        </div>
        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
            required
            minLength={3}
            className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
          <input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>
        <p className="text-center text-muted-foreground text-sm mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
