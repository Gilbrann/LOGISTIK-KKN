"use client";

import { useMemo, useState } from "react";
import katalog from "../../data/catalog.json";

type Jenis = "kelompok" | "pribadi";
type Barang = { id: string; kategori: string; nama: string; keterangan: string };

const kelompok: Barang[] = katalog.kelompok;
const pribadi: Barang[] = katalog.pribadi;

export default function InventarisPage() {
  const [jenis, setJenis] = useState<Jenis>("kelompok");
  const [cari, setCari] = useState("");
  const [kategori, setKategori] = useState("");
  const data = jenis === "kelompok" ? kelompok : pribadi;
  const kategoriTersedia = useMemo(
    () => [...new Set(data.map((item) => item.kategori))],
    [data],
  );
  const hasil = data.filter((item) => {
    const cocok = (item.nama + " " + item.kategori)
      .toLocaleLowerCase("id")
      .includes(cari.toLocaleLowerCase("id").trim());
    return cocok && (!kategori || item.kategori === kategori);
  });

  function pilihJenis(baru: Jenis) {
    setJenis(baru);
    setKategori("");
    setCari("");
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-[#1d2924]">
      <header className="border-b border-[#dfe6df] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <a href="/" className="text-lg font-bold tracking-tight">Logistik KKN</a>
          <span className="rounded-full bg-[#edf4ed] px-3 py-1 text-xs font-medium text-[#356448]">
            Daftar awal
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <a href="/" className="text-sm font-medium text-[#356448] hover:underline">
          ← Kembali ke beranda
        </a>
        <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
          Daftar barang KKN
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-[#58685e]">
          Daftar ini berasal dari pendataan awal. Jumlah, pemilik, dan status anggota
          akan ditambahkan setelah fitur akun dan penyimpanan data siap.
        </p>

        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Jenis barang">
          {(["kelompok", "pribadi"] as const).map((pilihan) => (
            <button
              key={pilihan}
              type="button"
              onClick={() => pilihJenis(pilihan)}
              aria-pressed={jenis === pilihan}
              className={
                "rounded-full px-5 py-2.5 text-sm font-semibold transition-colors " +
                (jenis === pilihan
                  ? "bg-[#24583c] text-white"
                  : "border border-[#dfe6df] bg-white text-[#1d2924] hover:bg-[#edf4ed]")
              }
            >
              {pilihan === "kelompok" ? "Barang kelompok" : "Barang pribadi"}
              <span className="ml-2 opacity-75">
                {pilihan === "kelompok" ? kelompok.length : pribadi.length}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_250px]">
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Cari barang</span>
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Contoh: rice cooker"
              className="w-full rounded-xl border border-[#cdd9ce] bg-white px-4 py-3 outline-none focus:border-[#24583c] focus:ring-2 focus:ring-[#b8d4bf]"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Kategori</span>
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              className="w-full rounded-xl border border-[#cdd9ce] bg-white px-4 py-3 outline-none focus:border-[#24583c] focus:ring-2 focus:ring-[#b8d4bf]"
            >
              <option value="">Semua kategori</option>
              {kategoriTersedia.map((nama) => (
                <option key={nama} value={nama}>{nama}</option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-6 text-sm text-[#58685e]">
          Menampilkan {hasil.length} dari {data.length} barang
        </p>
        {hasil.length ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {hasil.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[#dfe6df] bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#477558]">
                    {item.kategori}
                  </span>
                  <span className="text-xs text-[#718077]">{item.id}</span>
                </div>
                <h2 className="mt-4 text-lg font-semibold">{item.nama}</h2>
                {item.keterangan && (
                  <p className="mt-2 text-sm text-[#58685e]">{item.keterangan}</p>
                )}
                <p className="mt-5 border-t border-[#edf0eb] pt-3 text-xs text-[#718077]">
                  {jenis === "kelompok"
                    ? "Jumlah dan penanggung jawab belum didata"
                    : "Checklist per anggota belum aktif"}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-[#dfe6df] bg-white px-6 py-12 text-center text-[#58685e]">
            Tidak ada barang yang cocok. Coba kata kunci atau kategori lain.
          </div>
        )}
        <p className="mt-8 text-sm text-[#718077]">
          Data ini adalah salinan awal dari Excel, belum tersinkron otomatis.
        </p>
      </div>
    </main>
  );
}
