"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase";

type Request = {
  id: string; request_type: string; item_name: string; quantity: number;
  reason: string; status: string; staff_note: string | null; created_at: string;
};

const statusLabel: Record<string, string> = {
  pending: "Menunggu Perkap", approved: "Disetujui", rejected: "Ditolak",
  processing: "Diproses", ready: "Siap", borrowed: "Dipinjam",
  returned: "Dikembalikan", completed: "Selesai",
};

export default function PengajuanPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [rows, setRows] = useState<Request[]>([]);
  const [kind, setKind] = useState("pengadaan");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function reload(id: string) {
    const { data, error } = await supabaseBrowser().from("logistics_requests")
      .select("id,request_type,item_name,quantity,reason,status,staff_note,created_at")
      .eq("requester_id", id).order("created_at", { ascending: false });
    if (error) throw error;
    setRows(data || []);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const supabase = supabaseBrowser();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) { router.replace("/login"); return; }
        const { data: profile, error: profileError } = await supabase.from("profiles")
          .select("id").eq("id", user.id).maybeSingle();
        if (profileError) throw profileError;
        if (!profile) { router.replace("/gabung"); return; }
        if (!mounted) return;
        setUserId(user.id);
        await reload(user.id);
      } catch (error) {
        if (mounted) setMessage(error instanceof Error ? error.message : "Gagal memuat pengajuan.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !userId) return;
    setBusy(true);
    setMessage("");
    try {
      const qty = Number(quantity);
      if (!name.trim() || name.trim().length < 2 || name.trim().length > 150 || !Number.isFinite(qty) || qty <= 0) {
        throw new Error("Isi nama barang (2–150 karakter) dan jumlah lebih dari 0.");
      }
      const { error } = await supabaseBrowser().from("logistics_requests").insert({
        requester_id: userId, request_type: kind, item_name: name.trim(),
        quantity: qty, reason: reason.trim(), status: "pending",
      });
      if (error) throw error;
      setName(""); setQuantity("1"); setReason("");
      await reload(userId);
      setMessage("Pengajuan terkirim ke Perkap.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pengajuan gagal dikirim.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] px-5 py-10 text-[#1d2924]">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="text-sm text-[#24583c]">← Dashboard</Link>
        <h1 className="mt-6 text-3xl font-bold">Pengajuan logistik</h1>
        <p className="mt-2 text-[#58685e]">Ajukan barang yang perlu dibeli atau dipinjam untuk kegiatan KKN.</p>
        {loading && <p className="mt-6">Memuat pengajuan...</p>}
        {message && <p role="status" className="mt-5 rounded-xl border border-[#dfe6df] bg-white p-4 text-sm">{message}</p>}
        {!loading && userId && <>
          <form onSubmit={submit} className="mt-7 grid gap-4 rounded-2xl border border-[#dfe6df] bg-white p-5 sm:grid-cols-2">
            <label className="block text-sm font-medium">Jenis pengajuan
              <select value={kind} onChange={(e) => setKind(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cdd9ce] bg-white px-4 py-3">
                <option value="pengadaan">Pengadaan / pembelian</option>
                <option value="peminjaman">Peminjaman</option>
              </select>
            </label>
            <label className="block text-sm font-medium">Nama barang
              <input required minLength={2} maxLength={150} value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cdd9ce] px-4 py-3" />
            </label>
            <label className="block text-sm font-medium">Jumlah
              <input required type="number" min="0.01" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cdd9ce] px-4 py-3" />
            </label>
            <label className="block text-sm font-medium">Alasan / keterangan
              <input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cdd9ce] px-4 py-3" />
            </label>
            <button disabled={busy} className="rounded-xl bg-[#24583c] px-5 py-3 font-semibold text-white disabled:opacity-50 sm:col-span-2">{busy ? "Mengirim..." : "Kirim pengajuan"}</button>
          </form>
          <h2 className="mt-9 text-xl font-bold">Pengajuan saya</h2>
          {rows.length === 0 && <p className="mt-3 text-[#58685e]">Belum ada pengajuan.</p>}
          <div className="mt-4 space-y-3">{rows.map((row) => <article key={row.id} className="rounded-2xl border border-[#dfe6df] bg-white p-5">
            <div className="flex flex-wrap justify-between gap-2 text-sm text-[#477558]"><span>{row.request_type === "pengadaan" ? "Pengadaan" : "Peminjaman"}</span><span>{statusLabel[row.status] || row.status}</span></div>
            <h3 className="mt-2 font-semibold">{row.item_name} · {row.quantity}</h3>
            {row.reason && <p className="mt-1 text-sm text-[#58685e]">Alasan: {row.reason}</p>}
            {row.staff_note && <p className="mt-1 text-sm text-[#58685e]">Catatan Perkap: {row.staff_note}</p>}
            <p className="mt-3 text-xs text-[#718077]">{new Date(row.created_at).toLocaleString("id-ID")}</p>
          </article>)}</div>
        </>}
      </div>
    </main>
  );
}
