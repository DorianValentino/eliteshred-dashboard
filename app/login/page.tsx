"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const login = async () => {
    setMessage("");

    const { data, error } = await supabase
      .from("Klienten")
      .select("Email, Passwort, IsActivated, OnboardingDone")
      .eq("Email", email)
      .single();

    if (error || !data) {
      setMessage("❌ Diese E-Mail existiert nicht.");
      return;
    }

    if (data.Passwort !== password) {
      setMessage("❌ Falsches Passwort.");
      return;
    }

    localStorage.setItem("client_email", email);

    if (!data.OnboardingDone) {
      router.replace("/onboarding");
      return;
    }
    
    if (!data.IsActivated) {
    router.replace("/waiting");
    return;
  }
  
    router.replace("/dashboard");
};

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #050505, #000000 70%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "32px",
          background: "rgba(0,0,0,0.85)",
          borderRadius: "16px",
          border: "1px solid rgba(255,215,0,0.25)",
          boxShadow: "0 0 35px rgba(255,215,0,0.12)",
          animation: "fadeIn 0.5s ease",
        }}
      >
        {/* LOGO */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img
            src="/logo.png"
            alt="EliteShred Logo"
            style={{
              height: 58,
              objectFit: "contain",
              filter: "brightness(1.15)",
            }}
          />
        </div>

        <h1
          style={{
            fontSize: "34px",
            fontWeight: 800,
            marginBottom: "4px",
            background: "linear-gradient(90deg,#fff,#facc15)",
            WebkitBackgroundClip: "text",
            color: "transparent",
            textAlign: "center",
          }}
        >
          Login
        </h1>

        <p
          style={{
            color: "#aaa",
            marginBottom: "22px",
            fontSize: "14px",
            textAlign: "center",
          }}
        >
          Willkommen zurück im{" "}
          <span style={{ color: "#FFD700" }}>EliteShred Dashboard</span>.
        </p>

        {/* EMAIL */}
        <input
          type="email"
          placeholder="E-Mail eingeben"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            marginBottom: "12px",
            padding: "12px 14px",
            borderRadius: "10px",
            border: "1px solid rgba(255,215,0,0.3)",
            background: "#0c0c0c",
            color: "white",
            fontSize: "14px",
            marginRight: "20px",
          }}
        />

        {/* PASSWORT */}
        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            marginBottom: "12px",
            padding: "12px 14px",
            borderRadius: "10px",
            border: "1px solid rgba(255,215,0,0.3)",
            background: "#0c0c0c",
            color: "white",
            fontSize: "14px",
            marginRight: "20px"
          }}
        />

        {/* MESSAGE */}
        {message && (
          <p
            style={{
              color: "#FFD700",
              marginBottom: "12px",
              textAlign: "center",
              fontWeight: 500,
            }}
          >
            {message}
          </p>
        )}

        {/* SUBMIT */}
        <button
          onClick={login}
          style={{
            width: "100%",
            padding: "14px",
            marginTop: "4px",
            borderRadius: "12px",
            border: "none",
            background:
              "linear-gradient(90deg, #fbbf24 0%, #facc15 40%, #eab308 100%)",
            color: "#000",
            fontWeight: 800,
            fontSize: "15px",
            cursor: "pointer",
            boxShadow: "0 0 22px rgba(250,204,21,0.4)",
          }}
        >
          Login
        </button>
      </div>

      {/* Fade Animation */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
}
