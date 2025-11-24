"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { deleteClientByEmail } from "@/lib/deleteClient";

type Client = {
  ClientID: number;
  Name: string | null;
  Email: string | null;
  Paket: string | null;
  IsActivated: boolean | null;
  OnboardingDone?: boolean | null;
  StartGewicht?: string | null;
  Ziel?: string | null;
  Status?: string | null;
  Start?: string | null; // Startdatum für Countdown
};

type WeightPoint = {
  date: string | null;
  weight: number | null;
};

type ClientWithTracking = Client & {
  lastWeights: WeightPoint[];
};

// =========================
// HILFSFUNKTIONEN – GLOBAL
// =========================

// Restlaufzeit in Tagen berechnen
const getRemainingDays = (
  start: string | null | undefined,
  paket: string | null | undefined
): number | null => {
  if (!start) return null;

  const startDate = new Date(start);
  if (isNaN(startDate.getTime())) return null;

  let durationDays = 0;
  if (paket === "Monthly") durationDays = 30;
  else if (paket === "16" || paket === "16R") durationDays = 120;
  else durationDays = 90; // Fallback für weitere Pakete

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationDays);

  const today = new Date();
  const diffMs = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
};

const formatPaketName = (p: string | null) => {
  if (!p) return "-";
  if (p === "16R") return "16R Programm";
  if (p === "16") return "16 Wochen Programm";
  if (p === "Monthly") return "Monthly";
  if (p === "1:1") return "1:1 Coaching";
  return p;
};

const buildWeightString = (weights: WeightPoint[]) => {
  if (!weights.length) return "Noch keine Einträge";

  const numbers = weights
    .filter((w) => w.weight !== null)
    .map((w) => (w.weight as number).toFixed(1));

  if (!numbers.length) return "Noch keine Einträge";

  return numbers.join(" → ") + " kg"; // z.B. "82.1 → 81.6 → 80.9 kg"
};

const getTrendLabelAndColor = (weights: WeightPoint[]) => {
  if (weights.length < 2) {
    return { label: "Zu wenig Daten", color: "#6b7280" };
  }

  const current = weights[0].weight as number;
  const previous = weights[1].weight as number;

  const diff = current - previous; // + = schwerer, - = leichter

  if (diff <= -0.3) {
    return { label: "Gewicht runter", color: "#22c55e" }; // grün
  }
  if (diff >= 0.3) {
    return { label: "Gewicht hoch", color: "#ef4444" }; // rot
  }
  return { label: "Relativ stabil", color: "#eab308" }; // gelb
};

const getStartDiffString = (
  start: string | null | undefined,
  weights: WeightPoint[]
) => {
  if (!start || !weights.length) return "–";

  const startNum = parseFloat(String(start).replace(",", "."));
  if (isNaN(startNum)) return "–";

  const current = weights[0].weight as number;
  const diff = current - startNum; // + = nach oben, - = nach unten

  if (diff === 0) return "0.0 kg";

  const abs = Math.abs(diff).toFixed(1);
  if (diff < 0) return `-${abs} kg (unter Start)`;
  return `+${abs} kg (über Start)`;
};

// Mini-Chart-Pfad auf Basis der letzten Einträge (max. 7)
const buildMiniChartPath = (weights: WeightPoint[]) => {
  const valid = weights.filter((w) => w.weight !== null) as {
    date: string | null;
    weight: number;
  }[];

  if (!valid.length) return "";

  // Für Chart: ältester Eintrag links, neuester rechts
  const sorted = [...valid].reverse(); // weil wir aus DB "neueste zuerst" holen

  const values = sorted.map((w) => w.weight);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = 140;
  const height = 40;
  const paddingX = 4;
  const paddingY = 4;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  return sorted
    .map((p, index) => {
      const t =
        sorted.length === 1 ? 0.5 : index / (sorted.length - 1); // 0…1
      const x = paddingX + t * innerWidth;

      const norm = (p.weight - min) / range; // 0…1
      const y = paddingY + (1 - norm) * innerHeight;

      return `${x},${y}`;
    })
    .join(" ");
};

export default function PackageClientsPage() {
  const params = useParams();
  const router = useRouter();
  const paketParam = decodeURIComponent(params?.paket as string);

  const [clients, setClients] = useState<ClientWithTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // =========================
  // KLIENTEN + TRACKING LADEN
  // =========================
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      // 1) Klienten für dieses Paket holen
      const { data, error } = await supabase
        .from("Klienten")
        .select(
          "ClientID, Name, Email, Paket, IsActivated, OnboardingDone, StartGewicht, Ziel, Status, Start"
        )
        .eq("Paket", paketParam)
        .order("ClientID", { ascending: true });

      if (error) {
        console.log("Fehler beim Laden der Klienten:", error.message);
        setErrorMsg("Fehler beim Laden der Klienten.");
        setLoading(false);
        return;
      }

      const baseClients = (data || []) as Client[];

      // 2) Für jeden Klienten: letzte bis zu 7 Gewichts-Einträge holen
      const clientsWithTracking: ClientWithTracking[] = await Promise.all(
        baseClients.map(async (client) => {
          let lastWeights: WeightPoint[] = [];

          if (client.Email) {
            const { data: trackingData, error: trackingError } = await supabase
              .from("Tracking-Tabelle")
              .select("Datum, Gewicht")
              .eq("Email", client.Email)
              .not("Gewicht", "is", null)
              .order("Datum", { ascending: false })
              .limit(7); // bis zu 7 Einträge

            if (!trackingError && trackingData) {
              lastWeights = trackingData
                .map((row: any) => {
                  const raw = row.Gewicht as string | null;
                  const num =
                    raw !== null && raw !== undefined
                      ? parseFloat(String(raw).replace(",", "."))
                      : null;
                  return {
                    date: row.Datum as string | null,
                    weight: isNaN(num as number) ? null : (num as number),
                  };
                })
                .filter((w) => w.weight !== null);
            }
          }

          return {
            ...client,
            lastWeights,
          };
        })
      );

      setClients(clientsWithTracking);
      setLoading(false);
    };

    if (paketParam) {
      load();
    }
  }, [paketParam]);

  const paketTitle = formatPaketName(paketParam);

  // =========================
  // RENDER
  // =========================
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top left,#050505,#000000)",
        color: "white",
        padding: "40px 16px",
      }}
    >

      
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          background: "rgba(0,0,0,0.96)",
          borderRadius: "18px",
          padding: "24px",
          border: "1px solid rgba(255,215,0,0.3)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.9)",
        }}
      >
        {/* HEADER */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            marginBottom: "22px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#facc15",
                marginBottom: "4px",
              }}
            >
              EliteShred Admin · Paketansicht
            </div>
            <h1 style={{ fontSize: "24px", fontWeight: 700 }}>
              {paketTitle}
            </h1>
            <p
              style={{
                fontSize: "13px",
                color: "#9ca3af",
                marginTop: "4px",
              }}
            >
              Mini-Dashboard Übersicht aller Klienten in diesem Paket.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/admin-dashboard")}
            style={{
              padding: "8px 16px",
              borderRadius: "999px",
              border: "1px solid #facc15",
              background:
                "linear-gradient(90deg,#fbbf24,#facc15,#eab308)",
              color: "#111827",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 0 16px rgba(250,204,21,0.45)",
              whiteSpace: "nowrap",
            }}
          >
            Zurück zum Admin-Dashboard
          </button>
        </header>

        {/* FEHLER */}
        {errorMsg && (
          <div
            style={{
              marginBottom: "16px",
              padding: "10px 12px",
              borderRadius: "10px",
              border: "1px solid #f97373",
              background: "rgba(127,29,29,0.85)",
              fontSize: "13px",
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* CONTENT */}
        {loading ? (
          <p style={{ fontSize: "13px" }}>Lade Klienten...</p>
        ) : clients.length === 0 ? (
          <p style={{ fontSize: "13px" }}>
            Keine Klienten in diesem Paket gefunden.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
              gap: "16px",
            }}
          >
            {[...clients]
              .sort((a, b) => {
                const daysA = getRemainingDays(a.Start ?? null, a.Paket ?? null);
                const daysB = getRemainingDays(b.Start ?? null, b.Paket ?? null);

                // 1) Abgelaufen zuerst (<=0)
                const isExpiredA = daysA !== null && daysA <= 0;
                const isExpiredB = daysB !== null && daysB <= 0;

                if (isExpiredA && !isExpiredB) return -1;
                if (isExpiredB && !isExpiredA) return 1;

                // 2) Beide gültige Countdown → nach Tagen sortieren
                if (daysA !== null && daysB !== null) return daysA - daysB;

                // 3) Nur ein Countdown → der ohne Startdatum nach unten
                if (daysA !== null && daysB === null) return -1;
                if (daysA === null && daysB !== null) return 1;

                // 4) beide null → nach ID
                return (a.ClientID || 0) - (b.ClientID || 0);
              })
              .map((client) => {
                const weights = client.lastWeights;
                const weightString = buildWeightString(weights);
                const trend = getTrendLabelAndColor(weights);
                const startDiff = getStartDiffString(
                  client.StartGewicht ?? null,
                  weights
                );

                const currentWeight =
                  weights.length > 0 && weights[0].weight !== null
                    ? (weights[0].weight as number).toFixed(1) + " kg"
                    : "–";

                const lastDate =
                  weights.length > 0 && weights[0].date
                    ? weights[0].date
                    : "–";

                // Countdown-Info
                const remaining = getRemainingDays(
                  client.Start ?? null,
                  client.Paket ?? null
                );

                let countdownLabel = "Kein Startdatum";
                let countdownBg = "rgba(75,85,99,0.2)";
                let countdownBorder = "#6b7280";
                let countdownColor = "#d1d5db";

                if (remaining !== null) {
                  if (remaining <= 0) {
                    countdownLabel = "Coaching abgelaufen";
                    countdownBg = "rgba(239,68,68,0.15)";
                    countdownBorder = "#ef4444";
                    countdownColor = "#fca5a5";
                  } else if (remaining <= 10) {
                    countdownLabel = `${remaining} Tage übrig`;
                    countdownBg = "rgba(239,68,68,0.15)";
                    countdownBorder = "#ef4444";
                    countdownColor = "#fca5a5";
                  } else if (remaining <= 30) {
                    countdownLabel = `${remaining} Tage übrig`;
                    countdownBg = "rgba(251,191,36,0.12)";
                    countdownBorder = "#facc15";
                    countdownColor = "#facc15";
                  } else {
                    countdownLabel = `${remaining} Tage übrig`;
                    countdownBg = "rgba(34,197,94,0.15)";
                    countdownBorder = "#22c55e";
                    countdownColor = "#bbf7d0";
                  }
                }

                const chartPath = buildMiniChartPath(weights);

                return (
                  <div
                    key={client.ClientID}
                    style={{
                      borderRadius: "14px",
                      padding: "14px 14px 16px",
                      background:
                        "linear-gradient(135deg,#020617,#020617,#000000)",
                      border: "1px solid rgba(148,163,184,0.5)",
                      boxShadow: "0 0 20px rgba(0,0,0,0.9)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {/* Kopf: Name + Paket */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                          }}
                        >
                          {client.Name || "Ohne Name"}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#9ca3af",
                          }}
                        >
                          {client.Email || "-"}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "4px 8px",
                          borderRadius: "999px",
                          border: "1px solid rgba(250,204,21,0.7)",
                          color: "#facc15",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatPaketName(client.Paket)}
                      </span>
                    </div>

                    {/* Status-Zeile + Countdown */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px",
                        fontSize: "11px",
                        marginTop: "6px",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                        }}
                      >
                        <span
                          style={{
                            padding: "3px 7px",
                            borderRadius: "999px",
                            backgroundColor: client.IsActivated
                              ? "rgba(34,197,94,0.15)"
                              : "rgba(239,68,68,0.15)",
                            border: `1px solid ${
                              client.IsActivated ? "#22c55e" : "#ef4444"
                            }`,
                            color: client.IsActivated ? "#22c55e" : "#ef4444",
                          }}
                        >
                          {client.IsActivated ? "Aktiv" : "Nicht aktiv"}
                        </span>
                        <span
                          style={{
                            padding: "3px 7px",
                            borderRadius: "999px",
                            backgroundColor: client.OnboardingDone
                              ? "rgba(34,197,94,0.15)"
                              : "rgba(251,191,36,0.1)",
                            border: `1px solid ${
                              client.OnboardingDone ? "#22c55e" : "#facc15"
                            }`,
                            color: client.OnboardingDone
                              ? "#22c55e"
                              : "#facc15",
                          }}
                        >
                          {client.OnboardingDone
                            ? "Onboarding fertig"
                            : "Onboarding offen"}
                        </span>
                      </div>

                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "999px",
                          backgroundColor: countdownBg,
                          border: `1px solid ${countdownBorder}`,
                          color: countdownColor,
                          fontSize: "11px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {countdownLabel}
                      </span>
                    </div>

                    {/* GEWICHTSINFOS + MINI-CHART */}
                    <div
                      style={{
                        marginTop: "6px",
                        paddingTop: "6px",
                        borderTop: "1px solid rgba(31,41,55,0.9)",
                        fontSize: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "4px",
                          gap: "8px",
                        }}
                      >
                        <span style={{ opacity: 0.9 }}>
                          Letzte Einträge (max. 7):
                        </span>

                        {/* Mini Chart */}
                        {chartPath && (
                          <svg
                            width={140}
                            height={40}
                            style={{
                              background: "transparent",
                              flexShrink: 0,
                            }}
                          >
                            <polyline
                              fill="none"
                              stroke="#facc15"
                              strokeWidth={2}
                              points={chartPath}
                            />
                          </svg>
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: "12px",
                          color: "#e5e7eb",
                          marginBottom: "4px",
                        }}
                      >
                        {weightString}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "8px",
                          marginTop: "4px",
                        }}
                      >
                        <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                          <div>Aktuelles Gewicht:</div>
                          <div style={{ color: "#f9fafb" }}>
                            {currentWeight}
                          </div>
                          <div style={{ marginTop: "2px" }}>
                            Letzter Eintrag:
                          </div>
                          <div style={{ color: "#f9fafb" }}>{lastDate}</div>
                        </div>

                        <div style={{ fontSize: "11px", textAlign: "right" }}>
                          <div style={{ color: "#9ca3af" }}>
                            Trend (kurzfristig):
                          </div>
                          <div
                            style={{
                              color: trend.color,
                              fontWeight: 600,
                              marginTop: "1px",
                            }}
                          >
                            {trend.label}
                          </div>
                          <div
                            style={{
                              marginTop: "4px",
                              color: "#9ca3af",
                            }}
                          >
                            Veränderung vs. Start:
                          </div>
                          <div style={{ color: "#e5e7eb" }}>{startDiff}</div>
                        </div>
                      </div>
                    </div>

                    {/* ZIEL / STATUS */}
                    {(client.Ziel || client.Status) && (
                      <div
                        style={{
                          marginTop: "6px",
                          paddingTop: "6px",
                          borderTop: "1px solid rgba(31,41,55,0.9)",
                          fontSize: "12px",
                        }}
                      >
                        {client.Ziel && (
                          <div style={{ marginBottom: "4px" }}>
                            <span
                              style={{
                                color: "#9ca3af",
                                marginRight: "4px",
                              }}
                            >
                              Ziel:
                            </span>
                            <span>{client.Ziel}</span>
                          </div>
                        )}
                        {client.Status && (
                          <div>
                            <span
                              style={{
                                color: "#9ca3af",
                                marginRight: "4px",
                              }}
                            >
                              Status:
                            </span>
                            <span>{client.Status}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* DELETE BUTTON */}
                    <button
                      type="button"
                      onClick={async () => {
                        if (!client.Email) return;

                        const confirmDelete = window.confirm(
                          `Willst du ${client.Name || client.Email} wirklich löschen?`
                        );
                        if (!confirmDelete) return;

                        try {
                          await deleteClientByEmail(client.Email);
                          // Lokal aus dem State entfernen
                          setClients((prev) =>
                            prev.filter(
                              (c) => c.ClientID !== client.ClientID
                            )
                          );
                        } catch (err: any) {
                          console.error(
                            "Fehler beim Löschen:",
                            err?.message || err
                          );
                          alert(
                            "Fehler beim Löschen. Details: " +
                              (err?.message || "Unbekannter Fehler")
                          );
                        }
                      }}
                      style={{
                        marginTop: "10px",
                        padding: "6px 10px",
                        borderRadius: "8px",
                        background: "rgba(239,68,68,0.15)",
                        border: "1px solid #ef4444",
                        color: "#ef4444",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                        alignSelf: "flex-start",
                      }}
                    >
                      Klient vollständig löschen
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
