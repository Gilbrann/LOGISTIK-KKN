const fitur = [
  {
    judul: "Barang kelompok",
    deskripsi: "Pantau kebutuhan posko, jumlah barang yang tersedia, dan siapa yang membawanya.",
  },
  {
    judul: "Checklist pribadi",
    deskripsi: "Setiap anggota nantinya bisa mencatat perlengkapan yang siap dibawa.",
  },
  {
    judul: "Pengajuan logistik",
    deskripsi: "Ajukan barang yang kurang dan pantau prosesnya bersama Perkap.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f8f6] text-[#1d2924]">
      <header className="border-b border-[#dfe6df] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="text-lg font-bold tracking-tight">Logistik KKN</span>
          <span className="rounded-full bg-[#edf4ed] px-3 py-1 text-xs font-medium text-[#356448]">
            Dalam pengembangan
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#477558]">
            Persiapan kebutuhan KKN
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Kebutuhan posko, tertata di satu tempat.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#58685e]">
            Catat barang pribadi, pantau perlengkapan bersama, dan koordinasikan
            kebutuhan logistik dengan tim Perkap.
          </p>
          <a
            href="#fitur"
            className="mt-8 inline-block rounded-xl bg-[#24583c] px-6 py-3 font-semibold text-white hover:bg-[#19452e]"
          >
            Lihat rencana fitur
          </a>
        </div>
      </section>

      <section id="fitur" className="border-t border-[#dfe6df] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-bold">Yang sedang kami siapkan</h2>
          <p className="mt-2 text-[#58685e]">
            Halaman ini adalah tampilan awal. Fitur akun dan penyimpanan data
            akan ditambahkan bertahap.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {fitur.map((item) => (
              <div
                key={item.judul}
                className="rounded-2xl border border-[#dfe6df] p-6"
              >
                <h3 className="text-lg font-semibold">{item.judul}</h3>
                <p className="mt-3 leading-7 text-[#58685e]">
                  {item.deskripsi}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-8 text-sm text-[#718077]">
        Website Manajemen Logistik KKN
      </footer>
    </main>
  );
}