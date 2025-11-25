"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function WaitingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const email = localStorage.getItem("client_email");

    if (!email) {
      router.replace("/login");
      return;
    }

    const checkActivation = async () => {
      setChecking(true);
      const { data, error } = await supabase
        .from("Klienten")
        .select("IsActivated")
        .eq("Email", email)
        .single();

      setChecking(false);

      if (error) {
        console.log("IsActivated Check Fehler:", error.message);
        return;
      }

      if (data?.IsActivated) {
        router.replace("/dashboard");
      }
    };

    // sofort einmal checken
    checkActivation();

    // dann alle 10 Sekunden erneut prüfen
    const interval = setInterval(checkActivation, 10000);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        background: "radial-gradient(circle at top,#000,#050505)",
        color: "white",
        textAlign: "center",
        padding: "0 16px",
      }}
    >
      <h1
        style={{
          fontSize: 30,
          marginBottom: 16,
          fontWeight: 800,
          background: "linear-gradient(90deg,#fff,#facc15)",
          WebkitBackgroundClip: "text",
          color: "transparent",
        }}
      >
        Dein Dashboard wird eingerichtet
      </h1>

      <p
        style={{
          maxWidth: 420,
          opacity: 0.85,
          fontSize: 14,
          marginBottom: 20,
        }}
      >
        Dein Coach richtet jetzt deinen individuellen Plan ein.  
        Du erhältst Zugriff, sobald du freigeschaltet bist.
      </p>

      {/* LOADER (Desktop = Kreis, iPhone = 3 Punkt Loader) */}
      <div className="loader"><div /></div>

      <p style={{ fontSize: 12, color: "#9ca3af" }}>
        {checking
          ? "Status wird geprüft..."
          : "Wird automatisch aktualisiert, sobald du aktiviert bist."}
      </p>

      <style>
        {`
        /* Desktop Loader (Kreis wie bei dir) */
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .loader {
          width: 40px;
          height: 40px;
          border-radius: 999px;
          border: 3px solid rgba(250,204,21,0.3);
          border-top-color: #facc15;
          animation: spin 1s linear infinite;
          margin-bottom: 8px;
        }

        /* ------------------------------ */
        /* iPhone Loader (3 Punkte Style) */
        /* ------------------------------ */
        @media (max-width: 600px) {
          .loader {
            width: auto;
            height: auto;
            border: none;
            animation: none;
            display: flex;
            gap: 6px;
            margin-bottom: 8px;
            justify-content: center;
            align-items: center;
          }

          .loader::before,
          .loader::after,
          .loader div {
            content: "";
            width: 8px;
            height: 8px;
            background-color: #facc15;
            border-radius: 50%;
            display: inline-block;
            animation: pulse 1s infinite ease-in-out;
          }

          .loader::after {
            animation-delay: 0.2s;
          }

          .loader div {
            animation-delay: 0.4s;
          }

          @keyframes pulse {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
            40% { transform: scale(1); opacity: 1; }
          }
        }
      `}
      </style>
    </div>
  );
}