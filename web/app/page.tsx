"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../lib/supabase";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user }, error } = await supabaseBrowser().auth.getUser();
        if (mounted) router.replace(!error && user ? "/dashboard" : "/login");
      } catch {
        if (mounted) router.replace("/login");
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  return <main className="flex min-h-screen items-center justify-center bg-[#f7f8f6] text-[#58685e]">Membuka Logistik KKN...</main>;
}
