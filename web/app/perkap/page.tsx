"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase";

type Item = {
  id: string;
  category: string;
  name: string;
  needed_qty: number | null;
  available_qty: number | null;
  unit: string | null;
  responsible_person: string | null;
  note: string;
  active: boolean;
};

const blank = { category: "", name: "", needed_qty: "", available_qty: "", unit: "", responsible_person: "", note: "" };
type Draft = typeof blank;

function toDraft(item: Item): Draft {
  return {
    category: item.category,
    name: item.name,
    needed_qty: item.needed_qty?.toString() ?? "",
    available_qty: item.available_qty?.toString() ?? "",
    unit: item.unit ?? "",
    responsible_person: item.responsible_person ?? "",
    note: item.note,
  };
}

function toQuantity(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Jumlah harus angka 0 atau lebih.");
  return parsed;
}

export default function PerkapPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function reload() {
    const { data, error } = await supabaseBrowser().from("group_inventory")
      .select("id,category,name,needed_qty,available_qty,unit,responsible_person,note,active")
      .eq("active", true).order("category").order("name");
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
        const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (error) throw error;
        if (!profile) { router.replace("/gabung"); return; }
        if (!mounted) return;
        if (profile.role !== "perkap" && profile.role !== "admin") { setMessage("Akunmu masih berperan sebagai anggota. Halaman ini khusus Perkap dan admin."); return; }
        setAllowed(true);
        await reload();
      } catch (error) {
        if (mounted) setMessage(error instanceof Error ? error.message : "Data gagal dimuat.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  const shown = useMemo(() => items.filter((item) =>
    (item.name + " " + item.category).toLocaleLowerCase("id").includes(search.toLocaleLowerCase("id").trim())
  ), [items, search]);

  function startEdit(item: Item) { setEditing(item.id); setDraft(toDraft(item)); setMessage(""); }
  function startAdd() { setEditing("new"); setDraft(blank); setMessage(""); }
  function change(field: keyof Draft, value: string) { setDraft((prev) => ({ ...prev, [field]: value })); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (!draft.category.trim() || !draft.name.trim()) throw new Error("Kategori dan nama wajib diisi.");
      const payload = {
        category: draft.category.trim(), name: draft.name.trim(),
        needed_qty: toQuantity(draft.needed_qty), available_qty: toQuantity(draft.available_qty),
        unit: draft.unit.trim() || null, responsible_person: draft.responsible_person.trim() || null,
        note: draft.note.trim(), updated_at: new Date().toISOString(),
      };
      const supabase = supabaseBrowser();
      const result = editing === "new"
        ? await supabase.from("group_inventory").insert({ ...payload, id: "K-" + crypto.randomUUID() })
        : await supabase.from("group_inventory").update(payload).eq("id", editing).select("id");
      if (result.error) throw result.error;
      if (editing !== "new" && (!result.data || result.data.length !== 1)) throw new Error("Perubahan tidak tersimpan. Periksa izin akunmu.");
      await reload();
      setEditing(null);
      setMessage("Barang berhasil disimpan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan barang.");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(item: Item) {
    if (busy || !window.confirm("Nonaktifkan " + item.name + " dari daftar barang?")) return;
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabaseBrowser().from("group_inventory")
        .update({ active: false, updated_at: new Date().toISOString() }).eq("id", item.id).select("id");
      if (error) throw error;
      if (!data || data.length !== 1) throw new Error("Barang belum dinonaktifkan. Periksa izin akunmu.");
      await reload();
      setMessage("Barang dinonaktifkan. Riwayatnya tetap ada di database.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menonaktifkan barang.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] px-5 py-10 text-[#1d2924]">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="text-sm text-[#24583c]">← Dashboard</Link>
        <h1 className="mt-6 text-3xl font-bold">Barang kelompok · Perkap</h1>
        <p className="mt-2 text-[#58685e]">Kelola kebutuhan dan jumlah barang yang sudah tersedia.</p>
        {loading && <p className="mt-6">Memuat data...</p>}
        {message && <p role="status" className="mt-5 rounded-xl bg-white p-4 text-sm">{message}</p>}
        {allowed && <>
          <div className="mt-7 flex flex-wrap gap-3">
            <input aria-label="Cari barang" placeholder="Cari barang atau kategori" value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-[#cdd9ce] bg-white px-4 py-3" />
            <button onClick={startAdd} className="rounded-xl bg-[#24583c] px-5 py-3 font-semibold text-white">+ Tambah barang</button>
          </div>
          {editing && <form onSubmit={save} className="mt-5 grid gap-4 rounded-2xl border border-[#dfe6df] bg-white p-5 sm:grid-cols-2">
            <h2 className="sm:col-span-2 text-lg font-bold">{editing === "new" ? "Tambah barang" : "Ubah barang"}</h2>
            {([ ["category", "Kategori"], ["name", "Nama barang"], ["needed_qty", "Jumlah dibutuhkan"], ["available_qty", "Jumlah tersedia"], ["unit", "Satuan"], ["responsible_person", "Penanggung jawab"], ["note", "Catatan"] ] as [keyof Draft, string][]).map(([field, label]) => (
              <label key={field} className="block text-sm font-medium">{label}
                <input value={draft[field]} required={field === "category" || field === "name"} type={field === "needed_qty" || field === "available_qty" ? "number" : "text"} min={field === "needed_qty" || field === "available_qty" ? 0 : undefined} step={field === "needed_qty" || field === "available_qty" ? "any" : undefined} onChange={(e) => change(field, e.target.value)} className="mt-2 w-full rounded-xl border border-[#cdd9ce] px-4 py-3" />
              </label>
            ))}
            <div className="flex gap-3 sm:col-span-2">
              <button disabled={busy} className="rounded-xl bg-[#24583c] px-5 py-2.5 font-semibold text-white disabled:opacity-50">{busy ? "Menyimpan..." : "Simpan"}</button>
              <button type="button" disabled={busy} onClick={() => setEditing(null)} className="rounded-xl border border-[#cdd9ce] px-5 py-2.5">Batal</button>
            </div>
          </form>}
          <p className="mt-7 text-sm text-[#58685e]">{shown.length} barang ditampilkan</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {shown.map((item) => <article key={item.id} className="rounded-2xl border border-[#dfe6df] bg-white p-5">
              <div className="flex justify-between gap-3 text-xs text-[#477558]"><span>{item.category}</span><span>{item.id}</span></div>
              <h2 className="mt-2 font-semibold">{item.name}</h2>
              <p className="mt-2 text-sm">Butuh: {item.needed_qty ?? "—"} {item.unit ?? ""} · Tersedia: {item.available_qty ?? "—"} {item.unit ?? ""}</p>
              {item.responsible_person && <p className="mt-1 text-sm text-[#58685e]">Penanggung jawab: {item.responsible_person}</p>}
              {item.note && <p className="mt-1 text-sm text-[#58685e]">{item.note}</p>}
              <div className="mt-4 flex gap-4 text-sm font-medium">
                <button disabled={busy} onClick={() => startEdit(item)} className="text-[#24583c] underline">Ubah</button>
                <button disabled={busy} onClick={() => deactivate(item)} className="text-red-700 underline">Nonaktifkan</button>
              </div>
            </article>)}
          </div>
        </>}
      </div>
    </main>
  );
}
