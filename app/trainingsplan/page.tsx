"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function TrainingsplanPage() {
  const router = useRouter();
  const [client, setClient] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      <div style={{
        color: "white",
        padding: 40,
        textAlign: 'center',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: "radial-gradient(circle at top, #101010, #000000)", // EXTREM DUNKEL
      }}>
        Lade Trainingsplan...
      </div>
    );
  }

  const googleSheetsLink = client.TrainingsplanUrl;

  return (
    <div
      style={{
        minHeight: "100vh",
        // HINTERGRUND KORRIGIERT: Muss den vollen Gradienten verwenden, um konsistent zu sein
        background: "radial-gradient(circle at top, #101010, #000000)", 
        padding: isMobile ? "20px" : "40px",
        color: "white",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Zurück-Button: Fügt die Klasse hinzu und entfernt alle Farben/Schatten-Inline-Styles */}
      <button
        onClick={() => router.push("/dashboard")}
        className="btn-dark-outline" // <-- VERWENDET DIE KLASSE FÜR DUNKLE FARBEN/SCHATTEN
        style={{
          marginBottom: isMobile ? 30 : 40,
          padding: isMobile ? "10px 18px" : "12px 22px",
          borderRadius: "999px",
          // border, background, color, boxShadow ENTFERNT, da in .btn-dark-outline definiert
          cursor: "pointer",
          fontSize: isMobile ? "14px" : "16px",
          fontWeight: 600,
          transition: 'transform 0.2s ease', // Nur die Transformation beibehalten
          width: isMobile ? '100%' : 'auto', 
          maxWidth: '300px', // Wie in der Ernährungsplan Seite
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          // boxShadow ENTFERNT
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          // boxShadow ENTFERNT
        }}
      >
        ← Zurück zum Dashboard
      </button>

      {/* Hauptinhalts-Container im modernen Design */}
      <div
        style={{
          width: '100%',
          maxWidth: '800px',
          backgroundColor: '#050505', // Wie in der Ernährungsplan Seite für Konsistenz
          borderRadius: '16px',
          padding: isMobile ? '25px' : '40px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
          textAlign: 'center',
          border: '1px solid rgba(250, 204, 21, 0.2)',
        }}
      >
        <h1
          style={{
            fontSize: isMobile ? 32 : 42,
            fontWeight: 800,
            marginBottom: isMobile ? 30 : 40,
            color: '#facc15',
            textShadow: '0 0 15px rgba(250, 204, 21, 0.4)',
          }}
        >
          Dein Trainingsplan
        </h1>

        {!googleSheetsLink ? (
          <p style={{ fontSize: isMobile ? 16 : 18, color: '#aaa', marginTop: '20px' }}>
            Kein Trainingsplan hinterlegt. Bitte kontaktiere deinen Coach.
          </p>
        ) : (
          <div style={{ marginTop: isMobile ? 20 : 30 }}>
            <a
              href={googleSheetsLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '18px 35px',
                background: "linear-gradient(90deg, #facc15 0%, #eab308 100%)",
                color: '#000',
                fontWeight: 'bold',
                borderRadius: '999px',
                textDecoration: 'none',
                fontSize: isMobile ? 16 : 19,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                boxShadow: '0 8px #eab308',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 20px rgba(250, 204, 21, 0.6)';
                e.currentTarget.style.backgroundColor = '#eab308';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px #eab308';
                e.currentTarget.style.backgroundColor = '#facc15';
              }}
            >
              Gesamten Plan in Google Sheets öffnen
            </a>
          </div>
        )}
      </div>
    </div>
  );
}