"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase";

export default function GabungPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const supabase = supabaseBrowser();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) { router.replace("/login"); return; }
        const profile = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
        if (profile.error) throw profile.error;
        if (profile.data) router.replace("/dashboard");
      } catch (error) {
        if (mounted) setMessage(error instanceof Error ? error.message : "Gagal memeriksa akun.");
      } finally {
        if (mounted) setChecking(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  async function gabung(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabaseBrowser().rpc("join_kkn", { p_code: code.trim(), p_full_name: name.trim() });
      if (error) throw error;
      router.replace("/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal bergabung. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] px-5 py-12 text-[#1d2924]">
      <div className="mx-auto max-w-md">
        <h1 className="mt-10 text-3xl font-bold">Gabung tim KKN</h1>
        <p className="mt-2 text-[#58685e]">Isi nama dan kode undangan dari pengurus tim.</p>
        {checking ? <p className="mt-6">Memeriksa akun...</p> : (
          <form onSubmit={gabung} className="mt-7 space-y-4 rounded-2xl border border-[#dfe6df] bg-white p-6">
            <label className="block text-sm font-medium">Nama lengkap
              <input required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cdd9ce] px-4 py-3" />
            </label>
            <label className="block text-sm font-medium">Kode undangan
              <input required autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cdd9ce] px-4 py-3" />
            </label>
            <button disabled={busy} className="w-full rounded-xl bg-[#24583c] px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Memproses..." : "Gabung"}</button>
          </form>
        )}
        {message && <p role="alert" className="mt-4 text-sm text-red-700">{message}</p>}
      </div>
    </main>
  );
}
