"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { supabaseBrowser } from "../../lib/supabase";

export default function LupaPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setErrorMessage("");
    try {
      const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setMessage("Kalau email tersebut terdaftar, tautan pemulihan akan dikirim. Cek kotak masuk dan spam.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal mengirim email pemulihan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f7f6] px-5 py-12 text-[#09283f]">
      <div className="mx-auto max-w-md">
        <Link href="/login" className="text-sm text-[#165968]">← Masuk</Link>
        <h1 className="mt-10 text-3xl font-bold">Lupa password</h1>
        <p className="mt-2 text-[#4d6674]">Masukkan email akunmu. Kami akan kirim tautan untuk membuat password baru.</p>
        <form onSubmit={requestReset} className="mt-7 space-y-4 rounded-2xl border border-[#d9e5e4] bg-white p-6">
          <label className="block text-sm font-medium">Email
            <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#bfced2] px-4 py-3" />
          </label>
          <button disabled={busy} className="w-full rounded-xl bg-[#082b48] px-5 py-3 font-semibold text-white disabled:opacity-50">
            {busy ? "Mengirim..." : "Kirim tautan pemulihan"}
          </button>
          {message && <p role="status" className="text-sm text-[#165968]">{message}</p>}
          {errorMessage && <p role="alert" className="text-sm text-red-700">{errorMessage}</p>}
        </form>
      </div>
    </main>
  );
}
