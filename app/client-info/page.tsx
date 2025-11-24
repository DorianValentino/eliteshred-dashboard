"use client";

import { useRouter } from "next/navigation";

export default function ClientInfoPage() {
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top,#000000,#050505)",
        color: "white",
        padding: "40px 16px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          maxWidth: "720px",
          width: "100%",
          background: "rgba(0,0,0,0.9)",
          borderRadius: "16px",
          padding: "24px 20px 28px",
          border: "1px solid rgba(255,215,0,0.35)",
          boxShadow: "0 0 40px rgba(0,0,0,0.9)",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "18px" }}>
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#facc15",
              marginBottom: "4px",
            }}
          >
            EliteShred Client Dashboard
          </div>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 700,
              marginBottom: "6px",
            }}
          >
            Wie funktioniert dein Dashboard?
          </div>
          <p style={{ fontSize: "13px", color: "#9ca3af" }}>
            Kurzer Überblick, wie du täglich arbeitest, damit du maximal
            Fortschritt machst.
          </p>
        </div>

        {/* Inhalte */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            fontSize: "14px",
            lineHeight: 1.5,
          }}
        >
          <section
            style={{
              padding: "12px 14px",
              borderRadius: "12px",
              background: "#000000ff",
              border: "1px solid rgba(196, 191, 38, 0.4)",
            }}
          >
            <h2
              style={{
                fontSize: "16px",
                marginBottom: "6px",
                color: "#facc15",
              }}
            >
              1. Tägliches Tracking
            </h2>
            <p>
              Jeden Tag trägst du dein <strong>Gewicht</strong>, dein{" "}
              <strong>Training</strong> (z.B. Push / Pull / Rest) und deine{" "}
              <strong>Kalorien</strong> ein. Das ist die Basis für alle
              Auswertungen.
            </p>
          </section>

          <section
            style={{
              padding: "12px 14px",
              borderRadius: "12px",
              background: "#000000ff",
              border: "1px solid rgba(196, 191, 38, 0.4)",
            }}
          >
            <h2
              style={{
                fontSize: "16px",
                marginBottom: "6px",
                color: "#facc15",
              }}
            >
              2. Trainings- & Ernährungsplan
            </h2>
            <p>
              Oben im Dashboard findest du die Buttons{" "}
              <strong>„Trainingsplan“</strong> und{" "}
              <strong>„Ernährungsplan“</strong>. Dort siehst du deinen aktuellen
              Plan und wie du ihn umsetzen sollst.
            </p>
          </section>

          <section
            style={{
              padding: "12px 14px",
              borderRadius: "12px",
              background: "#000000ff",
              border: "1px solid rgba(196, 191, 38, 0.4)",
            }}
          >
            <h2
              style={{
                fontSize: "16px",
                marginBottom: "6px",
                color: "#facc15",
              }}
            >
              3. Uploads (Mahlzeiten & Formchecks)
            </h2>
            <p>
              Über den Button <strong>„Uploads“</strong> lädst du deine{" "}
              <strong>Mahlzeiten</strong> und deinen wöchentlichen{" "}
              <strong>Formcheck</strong> hoch. Dort ist klar markiert, was du
              täglich und was du nur Sonntag machen sollst.
            </p>
          </section>

          <section
            style={{
              padding: "12px 14px",
              borderRadius: "12px",
              background: "#000000ff",
              border: "1px solid rgba(196, 191, 38, 0.4)",
            }}
          >
            <h2
              style={{
                fontSize: "16px",
                marginBottom: "6px",
                color: "#facc15",
              }}
            >
              4. Gewichtsentwicklung & Wochenplan
            </h2>
            <p>
              Rechts siehst du deine <strong>Gewichtskurve</strong> und deinen{" "}
              <strong>Wochenplan</strong>. So erkennst du sofort, ob du dich
              an Training & Plan hältst und ob die Richtung stimmt.
            </p>
          </section>

          <section
            style={{
              padding: "12px 14px",
              borderRadius: "12px",
              background: "#000000ff",
              border: "1px solid rgba(196, 191, 38, 0.4)",
            }}
          >
            <h2
              style={{
                fontSize: "16px",
                marginBottom: "6px",
                color: "#facc15",
              }}
            >
              5. Wenn etwas nicht funktioniert
            </h2>
            <p>
              Wenn du mit irgendwas im Dashboard Probleme hast, meld dich direkt
              bei deinem Coach. Alles, was du hier einträgst, hilft bei der
              Anpassung deines Plans.
            </p>
          </section>
        </div>

        {/* Button zurück */}
        <div
          style={{
            marginTop: "20px",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            style={{
              padding: "10px 18px",
              borderRadius: "999px",
              border: "1px solid #facc15",
              background:
                "linear-gradient(90deg,#fbbf24 0%,#facc15 40%,#eab308 100%)",
              color: "#000000ff",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 0 16px rgba(250,204,21,0.45)",
            }}
          >
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
