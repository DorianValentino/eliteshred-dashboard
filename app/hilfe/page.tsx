"use client";

import { useRouter } from "next/navigation";

export default function HelpSupportPage() {
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top,#111111 0%,#020202 45%,#000000 100%)",
        color: "white",
        padding: "40px 16px",
      }}
    >
      <div
        style={{
          maxWidth: "780px",
          margin: "0 auto",
          background:
            "linear-gradient(145deg,rgba(10,10,10,0.98),rgba(0,0,0,0.98))",
          borderRadius: "20px",
          padding: "26px 22px 30px",
          border: "1px solid rgba(250,204,21,0.35)",
          boxShadow:
            "0 26px 80px rgba(0,0,0,0.95), 0 0 0 1px rgba(15,15,15,1)",
        }}
      >
        {/* HEADER */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            alignItems: "center",
            marginBottom: "22px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#facc15",
                marginBottom: "4px",
              }}
            >
              ELITESHRED · SUPPORT
            </div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: 700,
                letterSpacing: "0.03em",
              }}
            >
              Hilfe & Support
            </h1>
            <p
              style={{
                fontSize: "13px",
                color: "#9ca3af",
                marginTop: "5px",
                marginBottom: "30px",
                maxWidth: 420,
              }}
            >
              Wenn du Fragen zu deinem Plan, Fortschritt oder dem Dashboard
              hast, hier findest du genau, wann und wie du Support bekommst.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            style={{
              padding: "8px 16px",
              borderRadius: "999px",
              border: "1px solid rgba(250,204,21,0.9)",
              background:
                "linear-gradient(90deg,#fbbf24 0%,#facc15 35%,#eab308 100%)",
              color: "#111827",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 0 18px rgba(250,204,21,0.55)",
              whiteSpace: "nowrap",
            }}
          >
            Zurück zum Dashboard
          </button>
        </header>


        {/* STANDARD SUPPORT */}
        <section
          style={{
            marginBottom: "18px",
            padding: "16px 14px 14px",
            borderRadius: "16px",
            background:
              "linear-gradient(145deg,rgba(12,12,12,0.98),rgba(5,5,5,0.98))",
            border: "1px solid rgba(55,65,81,0.9)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#facc15",
              marginBottom: "6px",
            }}
          >
            Standard-Support
          </div>

          <h2
            style={{
              fontSize: "17px",
              fontWeight: 600,
              marginBottom: "6px",
            }}
          >
            16 · 16R · Monthly
          </h2>

          <p
            style={{
              fontSize: "13px",
              color: "#e5e7eb",
              marginBottom: "8px",
            }}
          >
            In diesen Zeitfenstern beantworte ich alle Nachrichten gesammelt im
            Dashboard-Chat:
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginBottom: "6px",
            }}
          >
            <div
              style={{
                padding: "8px 10px",
                borderRadius: "10px",
                backgroundColor: "rgba(17,24,39,0.9)",
                border: "1px solid rgba(75,85,99,0.9)",
                fontSize: "13px",
              }}
            >
              Mo – So · <span style={{ color: "#facc15" }}>09:00 – 11:00 Uhr</span>
            </div>
            <div
              style={{
                padding: "8px 10px",
                borderRadius: "10px",
                backgroundColor: "rgba(17,24,39,0.9)",
                border: "1px solid rgba(75,85,99,0.9)",
                fontSize: "13px",
              }}
            >
              Mo – So · <span style={{ color: "#facc15" }}>18:00 – 20:00 Uhr</span>
            </div>
          </div>

          <p
            style={{
              fontSize: "12px",
              color: "#9ca3af",
            }}
          >
            Nachrichten außerhalb dieser Zeiten werden im nächsten
            Support-Fenster beantwortet.
          </p>
        </section>

        {/* 1:1 PREMIUM SUPPORT */}
        <section
          style={{
            marginBottom: "20px",
            padding: "16px 14px 14px",
            borderRadius: "16px",
            background:
              "linear-gradient(145deg,rgba(15,15,15,1),rgba(0,0,0,1))",
            border: "1px solid rgba(250,204,21,0.7)",
            boxShadow: "0 0 26px rgba(250,204,21,0.25)",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#fde68a",
              marginBottom: "6px",
            }}
          >
            Priority Support (WhatsApp)
          </div>

          <h2
            style={{
              fontSize: "17px",
              fontWeight: 600,
              marginBottom: "6px",
            }}
          >
            1:1 Premium Coaching
          </h2>

          <p
            style={{
              fontSize: "13px",
              color: "#f9fafb",
              marginBottom: "8px",
            }}
          >
            Als 1:1 Klient hast du{" "}
            <span style={{ color: "#facc15", fontWeight: 600 }}>
              priorisierten Support über WhatsApp
            </span>
            .
          </p>

          <div
            style={{
              padding: "8px 10px",
              borderRadius: "10px",
              backgroundColor: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(250,204,21,0.7)",
              fontSize: "13px",
              marginBottom: "8px",
            }}
          >
            Mo – So · <span style={{ color: "#facc15" }}>08:00 – 22:00 Uhr</span>
          </div>

          <p
            style={{
              fontSize: "13px",
              color: "#facc15",
            }}
          >
            Antwortzeit:{" "}
            <strong>sofort bis maximal 3 Stunden</strong> – in der Regel deutlich
            schneller.
          </p>
        </section>

        {/* HOW TO WRITE GOOD MESSAGES */}
        <section
          style={{
            padding: "0px 14px 10px",
            borderRadius: "14px",
            marginTop: "50px",
            background:
              "linear-gradient(145deg,rgba(10,10,10,0.98),rgba(3,7,18,0.98))",
            border: "1px solid rgba(31,41,55,0.95)",
            fontSize: "12px",
            color: "#9ca3af",
          }}
        >
          <h3
            style={{
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "6px",
              color: "#e5e7eb",
            }}
          >
            So bekommst du die beste Antwort:
          </h3>
          <ul
            style={{
              paddingLeft: "18px",
              lineHeight: 1.5,
            }}
          >
            <li>
              Schreib klar, worum es geht (Training, Ernährung, Mindset,
              Technik).
            </li>
            <li>Wenn möglich: Datum + Situation + konkrete Frage.</li>
            <li>
              Bei technischen Problemen: Screenshot oder kurze Beschreibung
              anhängen.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
