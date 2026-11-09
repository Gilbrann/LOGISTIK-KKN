"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase";

type Jenis = "kelompok" | "pribadi";
type GroupItem = {
  id: string; category: string; name: string; note: string;
  needed_qty: number | null; available_qty: number | null;
  unit: string | null; responsible_person: string | null;
};
type PersonalItem = { id: string; category: string; name: string; note: string };

export default function InventarisPage() {
  const router = useRouter();
  const [jenis, setJenis] = useState<Jenis>("kelompok");
  const [kelompok, setKelompok] = useState<GroupItem[]>([]);
  const [pribadi, setPribadi] = useState<PersonalItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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
        const [groupResult, personalResult] = await Promise.all([
          supabase.from("group_inventory")
            .select("id,category,name,note,needed_qty,available_qty,unit,responsible_person")
            .eq("active", true).order("category").order("name"),
          supabase.from("personal_catalog")
            .select("id,category,name,note")
            .eq("active", true).order("category").order("name"),
        ]);
        if (groupResult.error) throw groupResult.error;
        if (personalResult.error) throw personalResult.error;
        if (!mounted) return;
        setKelompok(groupResult.data || []);
        setPribadi(personalResult.data || []);
      } catch (error) {
        if (mounted) setErrorMessage(error instanceof Error ? error.message : "Gagal memuat data barang.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  const data = jenis === "kelompok" ? kelompok : pribadi;
  const categories = useMemo(() => [...new Set(data.map((item) => item.category))], [data]);
  const shown = data.filter((item) => {
    const matches = (item.name + " " + item.category).toLocaleLowerCase("id")
      .includes(search.toLocaleLowerCase("id").trim());
    return matches && (!category || item.category === category);
  });

  function choose(value: Jenis) {
    setJenis(value);
    setCategory("");
    setSearch("");
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-[#1d2924]">
      <header className="border-b border-[#dfe6df] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-5">
          <Link href="/" className="text-lg font-bold tracking-tight">Logistik KKN</Link>
          <Link href="/dashboard" className="text-sm font-medium text-[#24583c] underline">Checklist saya</Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <Link href="/dashboard" className="text-sm font-medium text-[#356448]">← Dashboard</Link>
        <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">Daftar barang KKN</h1>
        <p className="mt-3 max-w-2xl leading-7 text-[#58685e]">
          Barang kelompok dan checklist pribadi berasal dari database tim. Jumlah barang kelompok diperbarui oleh Perkap.
        </p>
        {loading && <p className="mt-6">Memuat barang...</p>}
        {errorMessage && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{errorMessage}</p>}

        {!loading && !errorMessage && <>
          <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Jenis barang">
            {(["kelompok", "pribadi"] as const).map((value) => <button
              key={value} type="button" onClick={() => choose(value)} aria-pressed={jenis === value}
              className={"rounded-full px-5 py-2.5 text-sm font-semibold " + (jenis === value
                ? "bg-[#24583c] text-white" : "border border-[#dfe6df] bg-white hover:bg-[#edf4ed]")}
            >{value === "kelompok" ? "Barang kelompok" : "Barang pribadi"} <span className="ml-1 opacity-75">{value === "kelompok" ? kelompok.length : pribadi.length}</span></button>)}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_250px]">
            <label className="block text-sm font-medium">Cari barang
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Contoh: selotip" className="mt-2 w-full rounded-xl border border-[#cdd9ce] bg-white px-4 py-3" />
            </label>
            <label className="block text-sm font-medium">Kategori
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2 w-full rounded-xl border border-[#cdd9ce] bg-white px-4 py-3">
                <option value="">Semua kategori</option>
                {categories.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>

          <p className="mt-6 text-sm text-[#58685e]">Menampilkan {shown.length} dari {data.length} barang</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {jenis === "kelompok" ? (shown as GroupItem[]).map((item) => <article key={item.id} className="rounded-2xl border border-[#dfe6df] bg-white p-5">
              <div className="flex justify-between gap-3 text-xs text-[#477558]"><span>{item.category}</span><span>{item.id}</span></div>
              <h2 className="mt-4 text-lg font-semibold">{item.name}</h2>
              {item.note && <p className="mt-2 text-sm text-[#58685e]">{item.note}</p>}
              <div className="mt-5 border-t border-[#edf0eb] pt-3 text-sm">
                <p>Butuh: {item.needed_qty ?? "Belum diisi"} {item.unit ?? ""}</p>
                <p>Tersedia: {item.available_qty ?? "Belum diisi"} {item.unit ?? ""}</p>
                {item.responsible_person && <p className="mt-1 text-[#58685e]">Penanggung jawab: {item.responsible_person}</p>}
              </div>
            </article>) : (shown as PersonalItem[]).map((item) => <article key={item.id} className="rounded-2xl border border-[#dfe6df] bg-white p-5">
              <div className="flex justify-between gap-3 text-xs text-[#477558]"><span>{item.category}</span><span>{item.id}</span></div>
              <h2 className="mt-4 text-lg font-semibold">{item.name}</h2>
              {item.note && <p className="mt-2 text-sm text-[#58685e]">{item.note}</p>}
              <Link href="/dashboard" className="mt-5 inline-block text-sm font-medium text-[#24583c] underline">Atur status di checklist saya</Link>
            </article>)}
          </div>
          {shown.length === 0 && <p className="mt-4 rounded-xl border border-[#dfe6df] bg-white p-8 text-center text-[#58685e]">Tidak ada barang yang cocok.</p>}
        </>}
      </div>
    </main>
  );
}
