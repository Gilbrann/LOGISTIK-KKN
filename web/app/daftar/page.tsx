"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase";

export default function DaftarPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function daftar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabaseBrowser().auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: window.location.origin + "/login" },
      });
      if (error) throw error;
      if (data.session) router.replace("/gabung");
      else setMessage("Cek inbox email dan klik tautan konfirmasi. Sesudah itu, masuk memakai email dan kata sandi tadi. Cek folder spam juga bila belum terlihat.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pendaftaran gagal. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f7f6] px-5 py-12 text-[#09283f]">
      <div className="mx-auto max-w-md">
        <Link href="/login" className="text-sm text-[#082b48]">← Masuk</Link>
        <h1 className="mt-10 text-3xl font-bold">Daftar anggota KKN</h1>
        <p className="mt-2 text-[#4d6674]">Buat akun dengan emailmu. Kode undangan dimasukkan setelah login.</p>
        <form onSubmit={daftar} className="mt-7 space-y-4 rounded-2xl border border-[#d9e5e4] bg-white p-6">
          <label className="block text-sm font-medium">Email
            <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-[#bfced2] px-4 py-3" />
          </label>
          <label className="block text-sm font-medium">Kata sandi (minimal 6 karakter)
            <input required minLength={6} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-[#bfced2] px-4 py-3" />
          </label>
          <button disabled={busy} className="w-full rounded-xl bg-[#082b48] px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Memproses..." : "Buat akun"}</button>
          {message && <p role="status" className="text-sm text-[#082b48]">{message}</p>}
        </form>
        <p className="mt-5 text-sm">Sudah punya akun? <Link href="/login" className="font-semibold text-[#082b48] underline">Masuk</Link></p>
      </div>
    </main>
  );
}
