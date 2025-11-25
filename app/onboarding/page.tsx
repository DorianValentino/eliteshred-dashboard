"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const BUCKET_NAME = "formchecks"; // ❗ Falls dein Bucket anders heißt → hier anpassen

export default function OnboardingWizard() {
  const router = useRouter();

  // ZOOM & SCROLL deaktivieren (mobile-hardlock)
if (typeof window !== "undefined") {
  document.body.style.overflow = "hidden";         // kein scrollen
  document.documentElement.style.overflow = "hidden"; // fallback
}

  // Wizard Schritt
  const [step, setStep] = useState(1);

  // Basisdaten
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [alter, setAlter] = useState("");
  const [groesse, setGroesse] = useState("");
  const [startGewicht, setStartGewicht] = useState("");

  // Alltag & Schlaf
  const [alltag, setAlltag] = useState("");
  const [schlaf, setSchlaf] = useState("");

  // Ernährung
  const [mahlzeiten, setMahlzeiten] = useState("");
  const [lebensmittel, setLebensmittel] = useState("");

  // Training
  const [gym, setGym] = useState("");
  const [trainingstage, setTrainingstage] = useState("");
  const [einschraenkungen, setEinschraenkungen] = useState("");

  // Ziele & Problem
  const [ziele, setZiele] = useState("");
  const [problem, setProblem] = useState("");

  // Bilder
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [sideImage, setSideImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // =========================
  // NAVIGATION
  // =========================
  const goNext = () => {
    // simple Validierung pro Step
    if (step === 1) {
      if (!vorname || !nachname || !alter || !groesse || !startGewicht) {
        setErrorMsg("Bitte fülle alle Basisdaten aus (inkl. Startgewicht).");
        return;
      }
    }
    if (step === 2) {
      if (!alltag || !schlaf) {
        setErrorMsg("Bitte beantworte Fragen zu Alltag & Schlaf.");
        return;
      }
    }
    if (step === 3) {
      if (!mahlzeiten || !lebensmittel) {
        setErrorMsg("Bitte beantworte die Ernährungsfragen.");
        return;
      }
    }
    if (step === 4) {
      if (!gym || !trainingstage || !einschraenkungen) {
        setErrorMsg("Bitte beantworte alle Trainingsfragen.");
        return;
      }
    }
    if (step === 5) {
      if (!ziele || !problem) {
        setErrorMsg("Bitte formuliere deine Ziele und dein größtes Problem.");
        return;
      }
    }
    if (step === 6) {
      if (!frontImage || !sideImage || !backImage) {
        setErrorMsg("Bitte lade alle drei Formcheck-Bilder hoch.");
        return;
      }
    }

    setErrorMsg(null);
    if (step < 7) setStep(step + 1);
  };

  const goBack = () => {
    setErrorMsg(null);
    if (step > 1) setStep(step - 1);
  };

  // =========================
  // SPEICHERN (+ KI-Eintrag)
  // =========================
  const saveOnboarding = async () => {
    setErrorMsg(null);
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    console.log("SESSION:", sessionData);

    const email = localStorage.getItem("client_email");
    if (!email) {
      setLoading(false);
      setErrorMsg("Keine Session gefunden. Bitte logge dich erneut ein.");
      return;
    }

    try {
      if (!frontImage || !sideImage || !backImage) {
        setLoading(false);
        setErrorMsg("Bitte alle drei Bilder hochladen.");
        setStep(6);
        return;
      }

      // 1) Bilder uploaden
      const uploadImage = async (file: File, name: string) => {
        const ext = file.name.split(".").pop() || "jpg";

        const user = supabase.auth.getUser();
        const uid = (await user).data.user?.id;

        const path = `${uid}/onboarding/${name}.${ext}`;


        const { error: uploadErr } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(path, file, {
            upsert: true, // falls schon existiert, überschreiben
          });

        if (uploadErr) {
          console.log("Upload Fehler:", uploadErr.message);
          throw uploadErr;
        }

        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
        return data?.publicUrl ?? null;
      };

      const frontUrl = await uploadImage(frontImage, "front");
      const sideUrl = await uploadImage(sideImage, "side");
      const backUrl = await uploadImage(backImage, "back");

      // 2) Klienten-Daten speichern
      const { error: updateErr } = await supabase
        .from("Klienten")
        .update({
          Vorname: vorname,
          Nachname: nachname,
          Alter: alter,
          Groesse: groesse,
          StartGewicht: startGewicht,
          Alltag: alltag,
          Schlaf: schlaf,
          Mahlzeiten: mahlzeiten,
          Lebensmittel: lebensmittel,
          Gym: gym,
          Trainingstage: trainingstage,
          Einschraenkungen: einschraenkungen,
          Ziele: ziele,
          Problem: problem,
          FrontUrl: frontUrl,
          SideUrl: sideUrl,
          BackUrl: backUrl,
          OnboardingDone: true,
          IsActivated: false,
        })
        .eq("Email", email);

      if (updateErr) {
        console.log("Update Fehler:", updateErr.message);
        throw updateErr;
      }

      // 3) KI-Trainingsplan-Eintrag anlegen
      // -----------------------------------
      // Ziel grob einordnen (für "ziel_typ")
      const lowerZiele = ziele.toLowerCase();
      let zielTyp = "Custom";

      if (
        lowerZiele.includes("abnehmen") ||
        lowerZiele.includes("fett") ||
        lowerZiele.includes("definition")
      ) {
        zielTyp = "Abnehmen";
      } else if (
        lowerZiele.includes("muskel") ||
        lowerZiele.includes("aufbauen") ||
        lowerZiele.includes("masse")
      ) {
        zielTyp = "Muskelaufbau";
      } else if (
        lowerZiele.includes("leistung") ||
        lowerZiele.includes("stärker") ||
        lowerZiele.includes("performance")
      ) {
        zielTyp = "Performance";
      }

      // Trainingstage in Zahl umwandeln (wenn möglich)
      const trainingstageInt = trainingstage
        ? parseInt(trainingstage, 10)
        : null;

      const equipmentSummary = gym || "nicht angegeben";
      const einschrSummary = einschraenkungen || "keine";
      const notizen =
        `Ziele: ${ziele}\n` +
        `Größtes Problem: ${problem}\n` +
        `Alltag: ${alltag}\n` +
        `Schlaf (Angabe): ${schlaf}\n` +
        `Mahlzeiten: ${mahlzeiten}\n` +
        `Lebensmittel: ${lebensmittel}\n` +
        `Trainingstage (Input): ${trainingstage}\n`;

      // ❗ Falls deine Spalten in Supabase anders heißen,
      // bitte hier die Keys anpassen.
      const { error: kiError } = await supabase
        .from("KI_Trainingsplaene")
        .insert({
          email,
          ziel_typ: zielTyp,
          trainingstage: trainingstageInt,
          equipment: equipmentSummary,
          einschraenkungen: einschrSummary,
          notizen,
          status: "offen",
        });

      if (kiError) {
        // KI-Fehler soll NICHT das Onboarding blocken
        console.log("KI-Trainingsplan Insert Fehler:", kiError.message);
      }

      // 4) Weiter auf Waiting-Seite
      router.replace("/waiting");
    } catch (err: any) {
      console.log("Onboarding Fehler:", err?.message || err);
      setErrorMsg(
        "Beim Speichern ist ein Fehler passiert. Versuch es später erneut oder melde dich bei deinem Coach."
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // HILFS-UI-KOMPONENTEN
  // =========================
  const renderInput = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    options?: { type?: string; placeholder?: string }
  ) => (
    <div style={{ marginBottom: "10px" }}>
      <div
        style={{
          fontSize: "11px",
          color: "#facc15",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <input
        type={options?.type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={options?.placeholder}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: "8px",
          border: "1px solid rgba(148,163,184,0.7)",
          backgroundColor: "#020617",
          color: "white",
          fontSize: "14px",
        }}
      />
    </div>
  );

  const renderTextArea = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    options?: { placeholder?: string; rows?: number }
  ) => (
    <div style={{ marginBottom: "10px" }}>
      <div
        style={{
          fontSize: "11px",
          color: "#facc15",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={options?.placeholder}
        rows={options?.rows || 3}
        style={{
          width: "100%",
          padding: "8px 10px",
          borderRadius: "8px",
          border: "1px solid rgba(148,163,184,0.7)",
          backgroundColor: "#020617",
          color: "white",
          fontSize: "14px",
          resize: "vertical",
        }}
      />
    </div>
  );

  const renderFileUpload = (
    label: string,
    file: File | null,
    onChange: (f: File | null) => void
  ) => (
    <div style={{ marginBottom: "12px" }}>
      <div
        style={{
          fontSize: "11px",
          color: "#facc15",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <div style={{ position: "relative" }}>
        <input
          type="file"
          accept="image/*"
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0,
            cursor: "pointer",
          }}
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            onChange(f);
          }}
        />
        <button
          type="button"
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: "999px",
            border: "1px solid #facc15",
            background: "#020617",
            color: "#facc15",
            fontSize: "13px",
            fontWeight: 600,
            textAlign: "center",
            cursor: "pointer",
          }}
        >
          Datei auswählen
        </button>
      </div>
      <div
        style={{
          fontSize: "12px",
          marginTop: "4px",
          color: "#e5e7eb",
          minHeight: "16px",
        }}
      >
        {file ? file.name : ""}
      </div>
    </div>
  );

  // =========================
  // UI WRAPPER
  // =========================
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top,#000000,#050505)",
        color: "white",
        padding: "30px 16px",
      }}
    >
      <div
        style={{
          maxWidth: "540px",
          margin: "0 auto",
          background: "rgba(0,0,0,0.9)",
          borderRadius: "16px",
          padding: "24px 20px 28px",
          border: "1px solid rgba(255,215,0,0.35)",
          boxShadow: "0 0 40px rgba(0,0,0,0.9)",
        }}
      >
        {/* Header + Progress */}
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
            EliteShred Onboarding
          </div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 700,
              marginBottom: "10px",
            }}
          >
            Schritt {step} von 7
          </div>

          <div
            style={{
              width: "100%",
              height: "6px",
              background: "#111827",
              borderRadius: "999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(step / 7) * 100}%`,
                height: "100%",
                background:
                  "linear-gradient(90deg,#fbbf24 0%,#facc15 40%,#eab308 100%)",
              }}
            />
          </div>
        </div>

        {/* Fehler */}
        {errorMsg && (
          <div
            style={{
              marginBottom: "14px",
              padding: "8px 10px",
              borderRadius: "10px",
              border: "1px solid #f97373",
              background: "rgba(127,29,29,0.8)",
              fontSize: "12px",
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* STEP CONTENT */}
        {step === 1 && (
          <>
            <h2 style={{ fontSize: "20px", marginBottom: "8px" }}>Basisdaten</h2>
            <p
              style={{
                fontSize: "13px",
                color: "#9ca3af",
                marginBottom: "14px",
              }}
            >
              Ehrliche Startdaten = ehrlicher Plan. Startgewicht ist Pflicht.
            </p>

            {renderInput("Vorname", vorname, setVorname, {
              placeholder: "z.B. Max",
            })}
            {renderInput("Nachname", nachname, setNachname, {
              placeholder: "z.B. Mustermann",
            })}
            {renderInput("Alter", alter, setAlter, {
              type: "number",
              placeholder: "z.B. 28",
            })}
            {renderInput("Körpergröße (cm)", groesse, setGroesse, {
              type: "number",
              placeholder: "z.B. 180",
            })}
            {renderInput("Startgewicht (kg)", startGewicht, setStartGewicht, {
              type: "number",
              placeholder: "z.B. 82",
            })}
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={{ fontSize: "20px", marginBottom: "8px" }}>
              Alltag & Schlaf
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "#9ca3af",
                marginBottom: "14px",
              }}
            >
              Wie sieht dein Tag aus und wie gut schläfst du wirklich?
            </p>

            {renderTextArea(
              "Beruf / Alltag – wie sieht ein typischer Tag aus?",
              alltag,
              setAlltag,
              {
                placeholder:
                  "z.B. Bürojob, 8–9 Stunden sitzen, 1h Pendeln, viel Stress ...",
                rows: 4,
              }
            )}

            {renderInput(
              "Schlaf (Stunden/Nacht im Schnitt)",
              schlaf,
              setSchlaf,
              {
                type: "number",
                placeholder: "z.B. 6–7",
              }
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h2 style={{ fontSize: "20px", marginBottom: "8px" }}>Ernährung</h2>
            <p
              style={{
                fontSize: "13px",
                color: "#9ca3af",
                marginBottom: "14px",
              }}
            >
              Dein Plan soll zu deinem Alltag und deinen Vorlieben passen.
            </p>

            {renderTextArea(
              "Wie viele Mahlzeiten pro Tag sind für dich realistisch?",
              mahlzeiten,
              setMahlzeiten,
              {
                placeholder:
                  "z.B. 3 Hauptmahlzeiten + 1 Snack, Zeiten z.B. 8 / 13 / 19 Uhr ...",
                rows: 4,
              }
            )}

            {renderTextArea(
              "Lebensmittel, die du nicht magst / nicht verträgst",
              lebensmittel,
              setLebensmittel,
              {
                placeholder:
                  "z.B. Laktose, Gluten, Fisch, bestimmte Sorten Gemüse/Obst ...",
                rows: 3,
              }
            )}
          </>
        )}

        {step === 4 && (
          <>
            <h2 style={{ fontSize: "20px", marginBottom: "8px" }}>Training</h2>
            <p
              style={{
                fontSize: "13px",
                color: "#9ca3af",
                marginBottom: "14px",
              }}
            >
              Was ist realistisch – Gym, Equipment, Tage pro Woche?
            </p>

            {renderTextArea("Gym / Equipment", gym, setGym, {
              placeholder:
                "z.B. McFit, FitInn, Homegym mit Kurzhanteln, keine Maschinen etc.",
              rows: 3,
            })}

            {renderInput(
              "Trainingstage pro Woche (realistisch)",
              trainingstage,
              setTrainingstage,
              {
                type: "number",
                placeholder: "z.B. 3 oder 4",
              }
            )}

            {renderTextArea(
              "Verletzungen / Einschränkungen",
              einschraenkungen,
              setEinschraenkungen,
              {
                placeholder: "z.B. Knie, Schulter, Rücken – oder 'keine'",
                rows: 3,
              }
            )}
          </>
        )}

        {step === 5 && (
          <>
            <h2 style={{ fontSize: "20px", marginBottom: "8px" }}>
              Ziele & Hauptproblem
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "#9ca3af",
                marginBottom: "14px",
              }}
            >
              Das hier ist die Basis für deinen Plan. Schreib ehrlich.
            </p>

            {renderTextArea(
              "Deine 3 wichtigsten Ziele im Coaching",
              ziele,
              setZiele,
              {
                rows: 4,
                placeholder:
                  "- z.B. 10 kg Fett verlieren\n- sichtbarer Oberkörper\n- stabile Routinen im Alltag",
              }
            )}

            {renderTextArea(
              "Was ist aktuell dein größtes Problem beim Durchziehen?",
              problem,
              setProblem,
              {
                rows: 4,
                placeholder:
                  "z.B. Stress, Heißhunger am Abend, kein Plan, soziales Umfeld, etc.",
              }
            )}
          </>
        )}

        {step === 6 && (
          <>
            <h2 style={{ fontSize: "20px", marginBottom: "8px" }}>
              Formcheck – Startbilder
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "#9ca3af",
                marginBottom: "14px",
              }}
            >
              3 Bilder, klare Sicht auf den Körper. Nur für Planerstellung &
              Fortschritt.
            </p>

            {renderFileUpload("Bild vorne *", frontImage, setFrontImage)}
            {renderFileUpload("Bild seitlich *", sideImage, setSideImage)}
            {renderFileUpload("Bild hinten *", backImage, setBackImage)}
          </>
        )}

        {step === 7 && (
          <>
            <h2 style={{ fontSize: "20px", marginBottom: "8px" }}>
              Onboarding abschließen
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "#9ca3af",
                marginBottom: "12px",
              }}
            >
              Deine Daten und Bilder werden jetzt gespeichert. Dein Coach baut
              dein Dashboard und aktiviert dich danach.
            </p>

            <ul
              style={{
                fontSize: "13px",
                color: "#e5e7eb",
                marginLeft: "16px",
                marginBottom: "10px",
              }}
            >
              <li>• Alle Antworten werden in deinem Klientenprofil gespeichert</li>
              <li>• Deine Formcheck-Bilder bleiben vertraulich</li>
              <li>• Zugriff kommt, sobald dein Coach dich freischaltet</li>
            </ul>

            <p style={{ fontSize: "13px", color: "#facc15" }}>
              Klicke auf „Onboarding abschließen“, um alles zu speichern.
            </p>
          </>
        )}

        {/* Navigation unten */}
        <div
          style={{
            marginTop: "22px",
            display: "flex",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          {step > 1 ? (
            <button
              type="button"
              onClick={goBack}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "999px",
                border: "1px solid #4b5563",
                background: "transparent",
                color: "#e5e7eb",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Zurück
            </button>
          ) : (
            <div />
          )}

          {step < 7 && (
            <button
              type="button"
              onClick={goNext}
              style={{
                flex: 1.2,
                padding: "10px 14px",
                borderRadius: "999px",
                border: "1px solid #facc15",
                background:
                  "linear-gradient(90deg,#fbbf24 0%,#facc15 40%,#eab308 100%)",
                color: "#111827",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 0 16px rgba(250,204,21,0.45)",
              }}
            >
              Weiter
            </button>
          )}

          {step === 7 && (
            <button
              type="button"
              onClick={saveOnboarding}
              disabled={loading}
              style={{
                flex: 1.2,
                padding: "10px 14px",
                borderRadius: "999px",
                border: "1px solid #facc15",
                background:
                  "linear-gradient(90deg,#fbbf24 0%,#facc15 40%,#eab308 100%)",
                color: "#111827",
                fontSize: "13px",
                fontWeight: 700,
                cursor: loading ? "default" : "pointer",
                boxShadow: "0 0 16px rgba(250,204,21,0.45)",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Speichert..." : "Onboarding abschließen"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}