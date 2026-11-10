"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase";

type Profile = { id: string; full_name: string; role: string };
type Item = { id: string; category: string; name: string };
type Entry = { user_id: string; item_id: string; status: string };

const statusLabels: Record<string, string> = {
  belum_dicek: "Belum dicek",
  siap_dibawa: "Siap dibawa",
  perlu_dibeli: "Perlu dibeli",
  tidak_dibawa: "Tidak dibawa",
};

export default function AdminChecklistPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const supabase = supabaseBrowser();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { router.replace("/login"); return; }
      const { data: ownProfile, error: roleError } = await supabase.from("profiles")
        .select("role").eq("id", user.id).maybeSingle();
      if (roleError) throw roleError;
      if (!ownProfile) { router.replace("/gabung"); return; }
      if (ownProfile.role !== "admin") {
        setAllowed(false);
        setMessage("Halaman ini hanya untuk admin.");
        return;
      }
      setAllowed(true);
      const [people, catalog, checklist] = await Promise.all([
        supabase.from("profiles").select("id,full_name,role").order("full_name"),
        supabase.from("personal_catalog").select("id,category,name").eq("active", true).order("id"),
        supabase.from("personal_checklist").select("user_id,item_id,status"),
      ]);
      if (people.error) throw people.error;
      if (catalog.error) throw catalog.error;
      if (checklist.error) throw checklist.error;
      setProfiles(people.data || []);
      setItems(catalog.data || []);
      setEntries(checklist.data || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal mengambil data checklist.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const activeIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const statusByPerson = useMemo(() => {
    const result: Record<string, Record<string, string>> = {};
    for (const row of entries) {
      if (!activeIds.has(row.item_id)) continue;
      (result[row.user_id] ??= {})[row.item_id] = row.status;
    }
    return result;
  }, [entries, activeIds]);
  const visible = profiles.filter((person) =>
    person.full_name.toLocaleLowerCase("id").includes(search.toLocaleLowerCase("id").trim())
  );
  const selected = profiles.find((person) => person.id === selectedId);
  const completed = (person: Profile) => Object.values(statusByPerson[person.id] || {})
    .filter((status) => status !== "belum_dicek").length;
  const allComplete = profiles.filter((person) => items.length > 0 && completed(person) === items.length).length;

  return (
    <main className="min-h-screen bg-[#f3f7f6] px-5 py-10 text-[#09283f]">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="text-sm text-[#082b48]">← Dashboard</Link>
        <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-[#1b6570]">Khusus admin</p>
            <h1 className="mt-2 text-3xl font-bold">Pantau checklist anggota</h1>
            <p className="mt-2 text-[#4d6674]">Lihat pilihan terakhir setiap akun untuk barang pribadi yang masih aktif.</p>
          </div>
          {allowed && <button type="button" onClick={() => void load()} disabled={loading}
            className="rounded-xl border border-[#bfced2] bg-white px-4 py-2 text-sm font-medium disabled:opacity-50">
            {loading ? "Memuat..." : "Perbarui data"}
          </button>}
        </div>

        {message && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{message}</p>}
        {loading && !allowed && <p className="mt-6">Memuat data...</p>}
        {allowed && <>
          <p className="mt-7 text-sm text-[#4d6674]">{allComplete} dari {profiles.length} akun sudah mengisi semua {items.length} barang aktif. Akun admin ikut dihitung.</p>
          <label className="mt-6 block text-sm font-medium">Cari nama anggota
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nama anggota"
              className="mt-2 w-full rounded-xl border border-[#bfced2] bg-white px-4 py-3" />
          </label>
          {visible.length === 0 && !loading && <p className="mt-5">Belum ada akun yang cocok.</p>}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {visible.map((person) => {
              const done = completed(person);
              return <button type="button" key={person.id} onClick={() => setSelectedId(person.id)}
                className={`rounded-2xl border bg-white p-5 text-left ${selectedId === person.id ? "border-[#082b48]" : "border-[#d9e5e4]"}`}>
                <span className="flex items-start justify-between gap-3"><span className="font-semibold">{person.full_name}</span><span className="text-xs text-[#1b6570]">{person.role}</span></span>
                <span className="mt-3 block text-sm">{done} dari {items.length} barang diisi</span>
                <span className="mt-2 block h-2 overflow-hidden rounded-full bg-[#e7f2d8]">
                  <span className="block h-full bg-[#082b48]" style={{ width: `${items.length ? done / items.length * 100 : 0}%` }} />
                </span>
                <span className="mt-3 block text-xs text-[#1b6570]">Lihat rincian →</span>
              </button>;
            })}
          </div>
          {selected && <section className="mt-8 rounded-2xl border border-[#d9e5e4] bg-white p-5">
            <h2 className="text-xl font-bold">Checklist {selected.full_name}</h2>
            <p className="mt-1 text-sm text-[#4d6674]">{completed(selected)} dari {items.length} barang sudah dipilih statusnya.</p>
            <div className="mt-5 divide-y divide-[#d9e5e4]">
              {items.map((item) => {
                const status = statusByPerson[selected.id]?.[item.id] || "belum_dicek";
                return <div key={item.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                  <span><span className="font-medium">{item.name}</span><span className="ml-2 text-[#4d6674]">{item.category}</span></span>
                  <span className="text-[#082b48]">{statusLabels[status] || status}</span>
                </div>;
              })}
            </div>
          </section>}
        </>}
      </div>
    </main>
  );
}
