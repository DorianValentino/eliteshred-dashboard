"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function WaitingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  // 🔄 alle paar Sekunden checken, ob der Client aktiviert wurde
  useEffect(() => {
    const email = localStorage.getItem("client_email");
    if (!email) {
      router.replace("/login");
      return;
    }

    const interval = setInterval(async () => {
      setChecking(true);
      const { data, error } = await supabase
        .from("Klienten")
        .select("IsActivated, OnboardingDone")
        .eq("Email", email)
        .single();

      setChecking(false);

      if (!error && data?.IsActivated && data?.OnboardingDone) {
        router.replace("/dashboard");
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px 16px",
        background: "radial-gradient(circle at top, #020617, #000000 65%)",
        color: "#f9fafb",
      }}
    >
      <div
        style={{
          maxWidth: "520px",
          width: "100%",
          textAlign: "center",
          padding: "32px 24px 40px",
          borderRadius: "16px",
          background: "rgba(0,0,0,0.9)",
          border: "1px solid rgba(250,204,21,0.35)",
          boxShadow: "0 0 40px rgba(0,0,0,0.9)",
        }}
      >
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 800,
            marginBottom: "16px",
            lineHeight: 1.25,
            background: "linear-gradient(90deg,#fff,#facc15)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          Dein Dashboard wird eingerichtet
        </h1>

        <p
          style={{
            fontSize: "15px",
            color: "#e5e7eb",
            marginBottom: "10px",
          }}
        >
          Dein Coach richtet jetzt deinen individuellen Plan ein.
          Du erhältst Zugriff, sobald du freigeschaltet bist.
        </p>

        <p
          style={{
            fontSize: "13px",
            color: "#9ca3af",
            marginBottom: "0",
          }}
        >
          Wird automatisch aktualisiert, sobald du aktiviert bist.{" "}
          {checking ? "(prüfe Status …)" : ""}
        </p>

        {/* 🔁 Spinner – auf allen Geräten ein perfekter Kreis */}
        <div
          style={{
            margin: "32px auto 0",
            width: 64,
            height: 64,
            borderRadius: "999px",
            border: "4px solid rgba(250,204,21,0.22)",
            borderTopColor: "#facc15",
            animation: "es-spin 1s linear infinite",
          }}
        />

        <style>
          {`
            @keyframes es-spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </div>
  );
}