"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase";

type Item = { id: string; category: string; name: string; note: string };
type Draft = { category: string; name: string; note: string };
const empty: Draft = { category: "", name: "", note: "" };

export default function BarangPribadiPerkapPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function reload() {
    const { data, error } = await supabaseBrowser().from("personal_catalog")
      .select("id,category,name,note").eq("active", true).order("category").order("name");
    if (error) throw error;
    setItems(data || []);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const supabase = supabaseBrowser();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) { router.replace("/login"); return; }
        const { data: profile, error } = await supabase.from("profiles").select("role")
          .eq("id", user.id).maybeSingle();
        if (error) throw error;
        if (!profile) { router.replace("/gabung"); return; }
        if (!mounted) return;
        if (profile.role !== "perkap" && profile.role !== "admin") {
          setMessage("Halaman ini khusus Perkap dan admin."); return;
        }
        setAllowed(true);
        await reload();
      } catch (error) {
        if (mounted) setMessage(error instanceof Error ? error.message : "Gagal memuat barang pribadi.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  const shown = items.filter((item) => (item.name + " " + item.category)
    .toLocaleLowerCase("id").includes(search.toLocaleLowerCase("id").trim()));

  function add() { setEditing("new"); setDraft(empty); setMessage(""); }
  function edit(item: Item) {
    setEditing(item.id);
    setDraft({ category: item.category, name: item.name, note: item.note });
    setMessage("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || busy) return;
    setBusy(true); setMessage("");
    try {
      if (!draft.category.trim() || !draft.name.trim()) throw new Error("Kategori dan nama barang wajib diisi.");
      const payload = { category: draft.category.trim(), name: draft.name.trim(), note: draft.note.trim() };
      const supabase = supabaseBrowser();
      const result = editing === "new"
        ? await supabase.from("personal_catalog").insert({ ...payload, id: "P-" + crypto.randomUUID() }).select("id")
        : await supabase.from("personal_catalog").update(payload).eq("id", editing).select("id");
      if (result.error) throw result.error;
      if (!result.data || result.data.length !== 1) throw new Error("Barang belum tersimpan. Periksa izin akunmu.");
      await reload();
      setEditing(null);
      setMessage("Daftar barang pribadi berhasil diperbarui untuk semua anggota.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan barang.");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(item: Item) {
    if (busy || !window.confirm("Nonaktifkan " + item.name + " untuk semua anggota?")) return;
    setBusy(true); setMessage("");
    try {
      const { data, error } = await supabaseBrowser().from("personal_catalog")
        .update({ active: false }).eq("id", item.id).select("id");
      if (error) throw error;
      if (!data || data.length !== 1) throw new Error("Barang belum dinonaktifkan. Periksa izin akunmu.");
      await reload();
      setMessage("Barang dinonaktifkan dari daftar. Status checklist lama tetap tersimpan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menonaktifkan barang.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f7f6] px-5 py-10 text-[#09283f]">
      <div className="mx-auto max-w-4xl">
        <Link href="/perkap" className="text-sm text-[#082b48]">← Barang kelompok</Link>
        <h1 className="mt-6 text-3xl font-bold">Daftar barang pribadi</h1>
        <p className="mt-2 text-[#4d6674]">Perubahan di sini berlaku untuk checklist semua anggota. Status barang tiap anggota tetap milik akunnya masing-masing.</p>
        {loading && <p className="mt-6">Memuat barang...</p>}
        {message && <p role="status" className="mt-5 rounded-xl border border-[#d9e5e4] bg-white p-4 text-sm">{message}</p>}
        {allowed && !loading && <>
          <div className="mt-7 flex flex-wrap gap-3">
            <input aria-label="Cari barang" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari barang atau kategori" className="min-w-0 flex-1 rounded-xl border border-[#bfced2] bg-white px-4 py-3" />
            <button onClick={add} className="rounded-xl bg-[#082b48] px-5 py-3 font-semibold text-white">+ Tambah barang pribadi</button>
          </div>
          {editing && <form onSubmit={save} className="mt-5 space-y-4 rounded-2xl border border-[#d9e5e4] bg-white p-5">
            <h2 className="text-lg font-bold">{editing === "new" ? "Tambah barang pribadi" : "Ubah barang pribadi"}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">Kategori
                <input required value={draft.category} onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value }))} className="mt-2 w-full rounded-xl border border-[#bfced2] px-4 py-3" />
              </label>
              <label className="block text-sm font-medium">Nama barang
                <input required value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} className="mt-2 w-full rounded-xl border border-[#bfced2] px-4 py-3" />
              </label>
            </div>
            <label className="block text-sm font-medium">Catatan (opsional)
              <input value={draft.note} onChange={(e) => setDraft((prev) => ({ ...prev, note: e.target.value }))} className="mt-2 w-full rounded-xl border border-[#bfced2] px-4 py-3" />
            </label>
            <div className="flex gap-3">
              <button disabled={busy} className="rounded-xl bg-[#082b48] px-5 py-2.5 font-semibold text-white disabled:opacity-50">{busy ? "Menyimpan..." : "Simpan"}</button>
              <button type="button" disabled={busy} onClick={() => setEditing(null)} className="rounded-xl border border-[#bfced2] px-5 py-2.5">Batal</button>
            </div>
          </form>}
          <p className="mt-7 text-sm text-[#4d6674]">{shown.length} dari {items.length} barang</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">{shown.map((item) => <article key={item.id} className="rounded-2xl border border-[#d9e5e4] bg-white p-5">
            <div className="flex justify-between gap-3 text-xs text-[#1b6570]"><span>{item.category}</span><span>{item.id}</span></div>
            <h2 className="mt-2 font-semibold">{item.name}</h2>
            {item.note && <p className="mt-1 text-sm text-[#4d6674]">{item.note}</p>}
            <div className="mt-4 flex gap-4 text-sm font-medium">
              <button disabled={busy} onClick={() => edit(item)} className="text-[#082b48] underline">Ubah</button>
              <button disabled={busy} onClick={() => deactivate(item)} className="text-red-700 underline">Nonaktifkan</button>
            </div>
          </article>)}</div>
        </>}
      </div>
    </main>
  );
}
