"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      // 1) Prüfen, ob Magic-Link Token in URL ist (#access_token)
      const hash = window.location.hash;

      if (hash.includes("access_token")) {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Magic Link Fehler:", error);
          router.replace("/login");
          return;
        }

        // Erfolgreich eingeloggt → Dashboard
        router.replace("/dashboard");
        return;
      }

      // 2) Normale Session prüfen
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData.session) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    };

    run();
  }, [router]);

  return <p style={{ padding: 40 }}>Lade...</p>;
}