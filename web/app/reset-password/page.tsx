"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [accountEmail, setAccountEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabaseBrowser().auth.getSession();
        if (mounted) {
          setReady(!error && Boolean(data.session));
          setAccountEmail(data.session?.user.email || "");
          setChecking(false);
        }
      } catch {
        if (mounted) setChecking(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) { setMessage("Konfirmasi password belum sama."); return; }
    setBusy(true);
    setMessage("");
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal mengubah password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f7f6] px-5 py-12 text-[#09283f]">
      <div className="mx-auto max-w-md">
        <Link href="/login" className="text-sm text-[#165968]">← Masuk</Link>
        <h1 className="mt-10 text-3xl font-bold">Buat password baru</h1>
        {checking && <p className="mt-5 text-[#4d6674]">Memeriksa tautan pemulihan...</p>}
        {!checking && !ready && <p role="alert" className="mt-6 rounded-xl border border-[#d9e5e4] bg-white p-5 text-sm">
          Tautan pemulihan tidak berlaku atau sudah kedaluwarsa. <Link href="/lupa-password" className="font-semibold text-[#165968] underline">Minta tautan baru</Link>.
        </p>}
        {!checking && ready && <form onSubmit={updatePassword} className="mt-7 space-y-4 rounded-2xl border border-[#d9e5e4] bg-white p-6">
          <p className="text-sm text-[#4d6674]">Akun: <strong className="text-[#09283f]">{accountEmail}</strong></p>
          <label className="block text-sm font-medium">Password baru
            <input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#bfced2] px-4 py-3" />
          </label>
          <label className="block text-sm font-medium">Ulangi password baru
            <input required minLength={8} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#bfced2] px-4 py-3" />
          </label>
          <button disabled={busy} className="w-full rounded-xl bg-[#082b48] px-5 py-3 font-semibold text-white disabled:opacity-50">
            {busy ? "Menyimpan..." : "Simpan password baru"}
          </button>
          {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
        </form>}
      </div>
    </main>
  );
}
