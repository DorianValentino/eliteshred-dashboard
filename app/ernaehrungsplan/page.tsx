"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ErnaehrungsplanPage() {
  const router = useRouter();
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    const email = localStorage.getItem("client_email");

    if (!email) {
      router.replace("/login");
      return;
    }

    const loadClient = async () => {
      const { data, error } = await supabase
        .from("Klienten")
        .select("*")
        .eq("Email", email)
        .limit(1);

      if (!data || data.length === 0) {
        router.replace("/login");
        return;
      }

      setClient(data[0]);
    };

    loadClient();
  }, [router]);

  if (!client) {
    return (
      <div style={{ color: "white", padding: 40 }}>
        Lade Ernährungsplan...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top,#050505,#000)",
        padding: 20,
        color: "white",
      }}
    >
      <button
        onClick={() => router.push("/dashboard")}
        style={{
          marginBottom: 20,
          padding: "10px 18px",
          borderRadius: "999px",
          border: "1px solid #facc15",
          background: "#000",
          color: "#facc15",
          cursor: "pointer",
        }}
      >
        ← Zurück zum Dashboard
      </button>

      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 20 }}>
        Dein Ernährungsplan
      </h1>

      {!client.ErnaehrungsplanUrl ? (
        <p>Kein Ernährungsplan hinterlegt.</p>
      ) : (
        <iframe
          src={client.ErnaehrungsplanUrl}
          style={{
            width: "100%",
            height: "80vh",
            borderRadius: 12,
            border: "1px solid #facc15",
          }}
        />
      )}
    </div>
  );
}
