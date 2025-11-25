"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function WaitingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  // iPhone Detection
  const isIOS =
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent);

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

    checkActivation();
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

      {/* --- SPINNER --- */}
      {isIOS ? (
        // iPhone Standard Loader
        <div className="ios-loader" />
      ) : (
        // Desktop Spinner
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "999px",
            border: "3px solid rgba(250,204,21,0.3)",
            borderTopColor: "#facc15",
            animation: "spin 1s linear infinite",
            marginBottom: 8,
          }}
        />
      )}

      <p style={{ fontSize: 12, color: "#9ca3af" }}>
        {checking
          ? "Status wird geprüft..."
          : "Wird automatisch aktualisiert, sobald du aktiviert bist."}
      </p>

      <style>
        {`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* iPhone Native Loader */
        .ios-loader {
          width: 28px;
          height: 28px;
          border: 4px solid rgba(250,204,21,0.25);
          border-top-color: #facc15;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
      `}
      </style>
    </div>
  );
}