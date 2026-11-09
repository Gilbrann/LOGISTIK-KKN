"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase";

type Item = { id: string; category: string; name: string; note: string };
type Profile = { full_name: string; role: string };
type Status = "belum_dicek" | "siap_dibawa" | "perlu_dibeli" | "tidak_dibawa";
const choices: { value: Status; label: string }[] = [
  { value: "belum_dicek", label: "Belum dicek" },
  { value: "siap_dibawa", label: "Siap dibawa" },
  { value: "perlu_dibeli", label: "Perlu dibeli" },
  { value: "tidak_dibawa", label: "Tidak dibawa" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [saving, setSaving] = useState("");
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const supabase = supabaseBrowser();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) { router.replace("/login"); return; }
        const prof = await supabase.from("profiles").select("full_name,role").eq("id", user.id).maybeSingle();
        if (prof.error) throw prof.error;
        if (!prof.data) { router.replace("/gabung"); return; }
        const [catalog, checklist] = await Promise.all([
          supabase.from("personal_catalog").select("id,category,name,note").eq("active", true).order("id"),
          supabase.from("personal_checklist").select("item_id,status").eq("user_id", user.id),
        ]);
        if (catalog.error) throw catalog.error;
        if (checklist.error) throw checklist.error;
        if (!mounted) return;
        setUserId(user.id);
        setProfile(prof.data);
        setItems(catalog.data || []);
        setStatuses(Object.fromEntries((checklist.data || []).map((row) => [row.item_id, row.status as Status])));
      } catch (error) {
        if (mounted) setErrorMessage(error instanceof Error ? error.message : "Gagal mengambil checklist.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  const shown = useMemo(() => items.filter((item) =>
    (item.name + " " + item.category).toLocaleLowerCase("id").includes(search.toLocaleLowerCase("id").trim())
  ), [items, search]);
  const ready = items.filter((item) => statuses[item.id] === "siap_dibawa").length;

  async function changeStatus(itemId: string, next: Status) {
    if (!userId || saving) return;
    const previous = statuses[itemId] || "belum_dicek";
    setErrorMessage("");
    setSaving(itemId);
    setStatuses((current) => ({ ...current, [itemId]: next }));
    const { error } = await supabaseBrowser().from("personal_checklist").upsert({
      user_id: userId, item_id: itemId, status: next,
    }, { onConflict: "user_id,item_id" });
    if (error) {
      setStatuses((current) => ({ ...current, [itemId]: previous }));
      setErrorMessage(error.message);
    }
    setSaving("");
  }

  async function logout() {
    await supabaseBrowser().auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-[#1d2924]">
      <header className="border-b border-[#dfe6df] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-4">
          <Link href="/" className="font-bold">Logistik KKN</Link>
          <button onClick={logout} className="text-sm font-medium text-[#24583c] underline">Keluar</button>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-10">
        {loading && <p>Memuat data...</p>}
        {errorMessage && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p>}
        {profile && <>
          <p className="text-sm font-semibold uppercase tracking-widest text-[#477558]">Checklist pribadi · {profile.role}</p>
          <h1 className="mt-2 text-3xl font-bold">Halo, {profile.full_name}</h1>
          <p className="mt-3 text-[#58685e]">{ready} dari {items.length} barang siap dibawa. Pilihanmu tersimpan untuk akunmu.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/inventaris" className="rounded-xl border border-[#cdd9ce] bg-white px-4 py-2 text-sm font-medium">Lihat daftar barang kelompok</Link>
            <Link href="/pengajuan" className="rounded-xl border border-[#cdd9ce] bg-white px-4 py-2 text-sm font-medium">Ajukan barang</Link>
            {(profile.role === "perkap" || profile.role === "admin") && <>
              <Link href="/perkap" className="rounded-xl border border-[#cdd9ce] bg-white px-4 py-2 text-sm font-medium">Kelola barang kelompok</Link>
              <Link href="/perkap/barang-pribadi" className="rounded-xl border border-[#cdd9ce] bg-white px-4 py-2 text-sm font-medium">Kelola daftar pribadi</Link>
              <Link href="/perkap/pengajuan" className="rounded-xl border border-[#cdd9ce] bg-white px-4 py-2 text-sm font-medium">Proses pengajuan</Link>
            </>}
            {profile.role === "admin" && <Link href="/admin/checklist" className="rounded-xl border border-[#cdd9ce] bg-white px-4 py-2 text-sm font-medium">Pantau checklist anggota</Link>}
          </div>
          <label className="mt-8 block text-sm font-medium">Cari barang
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama atau kategori" className="mt-2 w-full rounded-xl border border-[#cdd9ce] bg-white px-4 py-3" />
          </label>
          {items.length === 0 && <p className="mt-5 text-sm text-[#58685e]">Belum ada barang di katalog. Periksa apakah seed.sql berhasil dijalankan.</p>}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {shown.map((item) => <article key={item.id} className="rounded-2xl border border-[#dfe6df] bg-white p-5">
              <div className="flex justify-between gap-3 text-xs text-[#477558]"><span>{item.category}</span><span>{item.id}</span></div>
              <h2 className="mt-2 font-semibold">{item.name}</h2>
              {item.note && <p className="mt-1 text-sm text-[#58685e]">{item.note}</p>}
              <label className="mt-4 block text-sm">Status
                <select value={statuses[item.id] || "belum_dicek"} disabled={Boolean(saving)} onChange={(e) => changeStatus(item.id, e.target.value as Status)} className="mt-2 w-full rounded-xl border border-[#cdd9ce] bg-white px-3 py-2.5 disabled:opacity-60">
                  {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
                </select>
              </label>
            </article>)}
          </div>
        </>}
      </div>
    </main>
  );
}
