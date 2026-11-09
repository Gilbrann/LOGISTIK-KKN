"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase";

type Request = {
  id: string; requester_id: string; request_type: string; item_name: string;
  quantity: number; reason: string; status: string; staff_note: string | null;
  created_at: string;
};
const statuses = [
  ["pending", "Menunggu"], ["approved", "Disetujui"], ["rejected", "Ditolak"],
  ["processing", "Diproses"], ["ready", "Siap"], ["borrowed", "Dipinjam"],
  ["returned", "Dikembalikan"], ["completed", "Selesai"],
] as const;

export default function PengajuanPerkapPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Request[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [draftStatus, setDraftStatus] = useState<Record<string, string>>({});
  const [draftNote, setDraftNote] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  async function reload() {
    const supabase = supabaseBrowser();
    const [requests, profiles] = await Promise.all([
      supabase.from("logistics_requests")
        .select("id,requester_id,request_type,item_name,quantity,reason,status,staff_note,created_at")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id,full_name"),
    ]);
    if (requests.error) throw requests.error;
    if (profiles.error) throw profiles.error;
    const next = requests.data || [];
    setRows(next);
    setNames(Object.fromEntries((profiles.data || []).map((profile) => [profile.id, profile.full_name])));
    setDraftStatus(Object.fromEntries(next.map((row) => [row.id, row.status])));
    setDraftNote(Object.fromEntries(next.map((row) => [row.id, row.staff_note || ""])));
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const supabase = supabaseBrowser();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) { router.replace("/login"); return; }
        const { data: profile, error: profileError } = await supabase.from("profiles")
          .select("role").eq("id", user.id).maybeSingle();
        if (profileError) throw profileError;
        if (!profile) { router.replace("/gabung"); return; }
        if (!mounted) return;
        if (profile.role !== "perkap" && profile.role !== "admin") {
          setMessage("Halaman ini khusus Perkap dan admin."); return;
        }
        setAllowed(true);
        await reload();
      } catch (error) {
        if (mounted) setMessage(error instanceof Error ? error.message : "Gagal mengambil pengajuan.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  async function save(row: Request) {
    if (busyId) return;
    setBusyId(row.id);
    setMessage("");
    try {
      const status = draftStatus[row.id];
      if (!statuses.some(([key]) => key === status)) throw new Error("Status tidak valid.");
      const { data, error } = await supabaseBrowser().from("logistics_requests")
        .update({ status, staff_note: draftNote[row.id]?.trim() || null, updated_at: new Date().toISOString() })
        .eq("id", row.id).select("id");
      if (error) throw error;
      if (!data || data.length !== 1) throw new Error("Perubahan tidak tersimpan. Periksa izin akun.");
      await reload();
      setMessage("Pengajuan berhasil diperbarui.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan pengajuan.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] px-5 py-10 text-[#1d2924]">
      <div className="mx-auto max-w-4xl">
        <Link href="/perkap" className="text-sm text-[#24583c]">← Barang kelompok</Link>
        <h1 className="mt-6 text-3xl font-bold">Pengajuan anggota</h1>
        <p className="mt-2 text-[#58685e]">Tinjau kebutuhan anggota dan beri status serta catatan tindak lanjut.</p>
        {loading && <p className="mt-6">Memuat pengajuan...</p>}
        {message && <p role="status" className="mt-5 rounded-xl border border-[#dfe6df] bg-white p-4 text-sm">{message}</p>}
        {allowed && !loading && <>
          <p className="mt-7 text-sm text-[#58685e]">{rows.length} pengajuan</p>
          {rows.length === 0 && <p className="mt-4 rounded-xl bg-white p-6">Belum ada pengajuan anggota.</p>}
          <div className="mt-4 space-y-4">{rows.map((row) => <article key={row.id} className="rounded-2xl border border-[#dfe6df] bg-white p-5">
            <div className="flex flex-wrap justify-between gap-2 text-sm text-[#477558]"><span>{names[row.requester_id] || "Anggota"} · {row.request_type === "pengadaan" ? "Pengadaan" : "Peminjaman"}</span><span>{new Date(row.created_at).toLocaleString("id-ID")}</span></div>
            <h2 className="mt-2 text-lg font-semibold">{row.item_name} · {row.quantity}</h2>
            {row.reason && <p className="mt-1 text-sm text-[#58685e]">Alasan: {row.reason}</p>}
            <div className="mt-5 grid gap-3 sm:grid-cols-[220px_1fr_auto] sm:items-end">
              <label className="block text-sm font-medium">Status
                <select value={draftStatus[row.id] || row.status} onChange={(e) => setDraftStatus((prev) => ({ ...prev, [row.id]: e.target.value }))} className="mt-2 w-full rounded-xl border border-[#cdd9ce] bg-white px-3 py-2.5">
                  {statuses.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium">Catatan untuk anggota
                <input value={draftNote[row.id] ?? ""} onChange={(e) => setDraftNote((prev) => ({ ...prev, [row.id]: e.target.value }))} className="mt-2 w-full rounded-xl border border-[#cdd9ce] px-3 py-2.5" />
              </label>
              <button disabled={Boolean(busyId)} onClick={() => save(row)} className="rounded-xl bg-[#24583c] px-5 py-2.5 font-semibold text-white disabled:opacity-50">{busyId === row.id ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </article>)}</div>
        </>}
      </div>
    </main>
  );
}
