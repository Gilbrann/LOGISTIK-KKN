"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function masuk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = supabaseBrowser();
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      const profile = await supabase.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
      if (profile.error) throw profile.error;
      router.replace(profile.data ? "/dashboard" : "/gabung");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login gagal. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] px-5 py-12 text-[#1d2924]">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm text-[#24583c]">← Beranda</Link>
        <h1 className="mt-10 text-3xl font-bold">Masuk</h1>
        <p className="mt-2 text-[#58685e]">Gunakan email dan kata sandi yang kamu daftarkan.</p>
        <form onSubmit={masuk} className="mt-7 space-y-4 rounded-2xl border border-[#dfe6df] bg-white p-6">
          <label className="block text-sm font-medium">Email
            <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cdd9ce] px-4 py-3" />
          </label>
          <label className="block text-sm font-medium">Kata sandi
            <input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cdd9ce] px-4 py-3" />
          </label>
          <button disabled={busy} className="w-full rounded-xl bg-[#24583c] px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Memproses..." : "Masuk"}</button>
          {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
        </form>
        <p className="mt-5 text-sm">Belum punya akun? <Link href="/daftar" className="font-semibold text-[#24583c] underline">Daftar</Link></p>
      </div>
    </main>
  );
}
