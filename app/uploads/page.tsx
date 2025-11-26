"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type MealCounts = Record<string, number>;

const getTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function UploadsPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>("");

  // Meals aus Klienten-Tabelle
  const [mealsFromClient, setMealsFromClient] = useState<string[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingMeal, setIsUploadingMeal] = useState(false);
  const [todayMealCounts, setTodayMealCounts] = useState<MealCounts>({});
  const [todayCheatCount, setTodayCheatCount] = useState<number>(0);

  // Cheat File
  const [cheatFile, setCheatFile] = useState<File | null>(null);
  const [isUploadingCheat, setIsUploadingCheat] = useState(false);

  // Form Check
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [sideFile, setSideFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [isUploadingForm, setIsUploadingForm] = useState(false);
  const [formCheckDoneToday, setFormCheckDoneToday] = useState(false);

  const [today] = useState(getTodayString());

  const mealFileInputRef = useRef<HTMLInputElement | null>(null);
  const cheatFileInputRef = useRef<HTMLInputElement | null>(null);

  const frontInputRef = useRef<HTMLInputElement | null>(null);
  const sideInputRef = useRef<HTMLInputElement | null>(null);
  const backInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const storedEmail = localStorage.getItem("client_email");
    if (!storedEmail) {
      router.replace("/login");
      return;
    }
    setEmail(storedEmail);
    loadClientAndCounts(storedEmail);
  }, [router]);

  const loadClientAndCounts = async (mail: string) => {
    // Klient holen (Name + Meals)
    const { data: clientData, error: clientError } = await supabase
      .from("Klienten")
      .select("Name, Meals")
      .eq("Email", mail)
      .limit(1);

    if (!clientError && clientData && clientData.length > 0) {
      const client = clientData[0] as any;
      setClientName(client.Name ?? "");
      if (client.Meals && Array.isArray(client.Meals)) {
        setMealsFromClient(client.Meals);
        if (client.Meals.length > 0) {
          setSelectedMeal(client.Meals[0]);
        }
      }
    }

    // FoodImages für heute laden (Meals + Cheat + Form)
    const { data: foodData, error: foodError } = await supabase
      .from("FoodImages")
      .select("Kategorie, Datum")
      .eq("Email", mail)
      .eq("Datum", getTodayString());

    if (!foodError && foodData) {
      const counts: MealCounts = {};
      let cheats = 0;
      let formToday = false;

      (foodData as any[]).forEach((row) => {
        const kat = row.Kategorie as string;
        if (kat === "Cheat") {
          cheats += 1;
        } else if (kat.startsWith("Form-")) {
          formToday = true;
        } else {
          counts[kat] = (counts[kat] || 0) + 1;
        }
      });

      setTodayMealCounts(counts);
      setTodayCheatCount(cheats);
      setFormCheckDoneToday(formToday);
    }
  };

  const handleMealUpload = async () => {
    if (!email) return;
    if (!selectedMeal) {
      alert("Bitte wähle zuerst eine Mahlzeit aus.");
      return;
    }
    if (!selectedFile) {
      alert("Bitte wähle zuerst eine Datei aus.");
      return;
    }

    const already = todayMealCounts[selectedMeal] || 0;
    if (already >= 1) {
      alert("Du hast heute für diese Mahlzeit bereits ein Bild hochgeladen.");
      return;
    }

    setIsUploadingMeal(true);

    try {
      const ext = selectedFile.name.split(".").pop();
      const filePath = `${email}/${today}_${Date.now()}_${selectedMeal}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("meal-images")
        .upload(filePath, selectedFile);

      if (uploadError) {
        console.log("Upload Fehler (Meal):", uploadError.message);
        alert("Upload fehlgeschlagen.");
        setIsUploadingMeal(false);
        return;
      }

      const { data: publicData } = supabase.storage
        .from("meal-images")
        .getPublicUrl(filePath);

      const publicUrl = publicData?.publicUrl;

      const { error: dbError } = await supabase.from("FoodImages").insert([
        {
          Email: email,
          ImageUrl: publicUrl,
          Datum: today,
          Kategorie: selectedMeal,
        },
      ]);

      if (dbError) {
        console.log("DB Fehler FoodImages (Meal):", dbError.message);
        alert("Speichern in Datenbank fehlgeschlagen.");
      } else {
        await loadClientAndCounts(email);
        setSelectedFile(null);
      }
    } finally {
      setIsUploadingMeal(false);
    }
  };

  const handleCheatUpload = async () => {
    if (!email) return;
    if (!cheatFile) {
      alert("Bitte Datei für dein Cheat Meal wählen.");
      return;
    }
    if (todayCheatCount >= 1) {
      alert("Du hast heute bereits ein Cheat Meal hochgeladen.");
      return;
    }

    setIsUploadingCheat(true);

    try {
      const ext = cheatFile.name.split(".").pop();
      const filePath = `${email}/cheat_${today}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("meal-images")
        .upload(filePath, cheatFile);

      if (uploadError) {
        console.log("Upload Fehler (Cheat):", uploadError.message);
        alert("Upload fehlgeschlagen.");
        setIsUploadingCheat(false);
        return;
      }

      const { data: publicData } = supabase.storage
        .from("meal-images")
        .getPublicUrl(filePath);

      const publicUrl = publicData?.publicUrl;

      const { error: dbError } = await supabase.from("FoodImages").insert([
        {
          Email: email,
          ImageUrl: publicUrl,
          Datum: today,
          Kategorie: "Cheat",
        },
      ]);

      if (dbError) {
        console.log("DB Fehler FoodImages (Cheat):", dbError.message);
        alert("Speichern in Datenbank fehlgeschlagen.");
      } else {
        await loadClientAndCounts(email);
        setCheatFile(null);
      }
    } finally {
      setIsUploadingCheat(false);
    }
  };

  const handleFormCheckUpload = async () => {
    if (!email) return;

    const todayDate = new Date();
    const isSunday = todayDate.getDay() === 0; // 0 = Sonntag

    if (!isSunday) {
      alert("Form Check ist nur sonntags vorgesehen.");
      return;
    }

    if (formCheckDoneToday) {
      alert("Du hast für heute bereits einen Form Check hochgeladen.");
      return;
    }

    if (!frontFile || !sideFile || !backFile) {
      alert("Bitte alle drei Bilder (vorne, seitlich, hinten) auswählen.");
      return;
    }

    setIsUploadingForm(true);

    try {
      const files = [
        { file: frontFile, label: "Form-Front" },
        { file: sideFile, label: "Form-Side" },
        { file: backFile, label: "Form-Back" },
      ];

      const inserts: any[] = [];

      for (const item of files) {
        const ext = item.file.name.split(".").pop();
        const filePath = `${email}/form_${today}_${item.label}_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("meal-images")
          .upload(filePath, item.file);

        if (uploadError) {
          console.log("Upload Fehler (Form):", uploadError.message);
          alert("Upload fehlgeschlagen (Form Check).");
          setIsUploadingForm(false);
          return;
        }

        const { data: publicData } = supabase.storage
          .from("meal-images")
          .getPublicUrl(filePath);

        const publicUrl = publicData?.publicUrl;

        inserts.push({
          Email: email,
          ImageUrl: publicUrl,
          Datum: today,
          Kategorie: item.label,
        });
      }

      const { error: dbError } = await supabase
        .from("FoodImages")
        .insert(inserts);

      if (dbError) {
        console.log("DB Fehler FoodImages (Form):", dbError.message);
        alert("Speichern des Form Checks ist fehlgeschlagen.");
      } else {
        setFormCheckDoneToday(true);
        setFrontFile(null);
        setSideFile(null);
        setBackFile(null);
        alert("Form Check erfolgreich hochgeladen.");
      }
    } finally {
      setIsUploadingForm(false);
    }
  };

  const totalImagesToday =
    Object.values(todayMealCounts).reduce((sum, c) => sum + c, 0) +
    todayCheatCount;

  if (!email) {
    return null;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top,#050505,#000000 70%)",
        color: "white",
        padding: "32px 16px",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          background: "rgba(0,0,0,0.95)",
          borderRadius: "18px",
          padding: "22px",
          border: "1px solid rgba(250,204,21,0.35)",
          boxShadow: "0 24px 70px rgba(0,0,0,0.95)",
          display: "flex",
          flexDirection: "column",
          gap: "22px",
        }}
      >
        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#6b7280",
                marginBottom: "4px",
              }}
            >
              EliteShred · Uploads
            </div>
            <h1
              style={{
                fontSize: "24px",
                fontWeight: 800,
                background:
                  "linear-gradient(90deg,#ffffff,#fef9c3,#facc15)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              {clientName || "Deine Uploads"}
            </h1>
            <p style={{ fontSize: "13px", color: "#9ca3af" }}>
              Email: <span style={{ fontWeight: 600 }}>{email}</span>
            </p>
          </div>

          <button
            onClick={() => router.push("/dashboard")}
            style={{
              padding: "8px 16px",
              borderRadius: "999px",
              border: "1px solid rgba(250,204,21,0.7)",
              background: "#000000",
              color: "#facc15",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            ← Zurück zum Dashboard
          </button>
        </header>

        {/* Grid: Mahlzeiten + Form Check */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.5fr) minmax(0,1.5fr)",
            gap: "18px",
          }}
        >
          {/* Mahlzeiten-Uploads */}
          <section
            style={{
              padding: "16px",
              borderRadius: "14px",
              background: "#050608",
              border: "1px solid rgba(250,204,21,0.25)",
              boxShadow: "0 0 30px rgba(0,0,0,0.9)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <h2 style={{ fontSize: "18px", fontWeight: 700 }}>
                Mahlzeiten-Uploads (heute)
              </h2>
              <span style={{ fontSize: "13px", color: "#facc15" }}>
                Bilder heute: {totalImagesToday}
              </span>
            </div>

            {mealsFromClient.length === 0 ? (
              <p style={{ fontSize: "14px" }}>
                Dein Coach hat noch keine Mahlzeiten (Meals) hinterlegt.
              </p>
            ) : (
              <>
                <div>
                  <label
                    style={{
                      fontSize: "11px",
                      color: "#facc15",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Mahlzeit auswählen
                  </label>
                  <select
                    value={selectedMeal}
                    onChange={(e) => setSelectedMeal(e.target.value)}
                    style={{
                      width: "100%",
                      marginTop: "4px",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid rgba(250,204,21,0.35)",
                      backgroundColor: "#020202",
                      color: "white",
                      fontSize: "14px",
                    }}
                  >
                    {mealsFromClient.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      fontSize: "11px",
                      color: "#facc15",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Bild auswählen
                  </label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginTop: "4px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => mealFileInputRef.current?.click()}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "999px",
                        border: "1px solid #FFD700",
                        background:
                          "linear-gradient(90deg,#fbbf24,#facc15,#eab308)",
                        color: "#111111",
                        fontWeight: 600,
                        cursor: "pointer",
                        boxShadow: "0 0 12px rgba(250,204,21,0.4)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Datei wählen
                    </button>

                    <span
                      style={{
                        fontSize: "13px",
                        color: selectedFile ? "#e5e7eb" : "#6b7280",
                      }}
                    >
                      {selectedFile ? selectedFile.name : "Keine Datei gewählt"}
                    </span>

                    <input
                      ref={mealFileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSelectedFile(file);
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleMealUpload}
                  disabled={isUploadingMeal}
                  style={{
                    marginTop: "4px",
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: "999px",
                    border: "1px solid #FFD700",
                    background: isUploadingMeal
                      ? "rgba(250,204,21,0.3)"
                      : "linear-gradient(90deg,#fbbf24,#facc15,#eab308)",
                    color: "#111111",
                    fontWeight: 700,
                    cursor: isUploadingMeal ? "default" : "pointer",
                    boxShadow: "0 0 18px rgba(250,204,21,0.4)",
                    fontSize: "14px",
                  }}
                >
                  {isUploadingMeal ? "Wird hochgeladen..." : "Bild hochladen"}
                </button>

                {/* Kleine Übersicht der Meals */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                    gap: "8px",
                    marginTop: "8px",
                  }}
                >
                  {mealsFromClient.map((m, idx) => {
                    const count = todayMealCounts[m] || 0;
                    return (
                      <div
                        key={m}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "10px",
                          background:
                            "linear-gradient(145deg,#020617,#020617,#020617)",
                          border: "1px solid rgba(250,204,21,0.35)",
                          fontSize: "13px",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            marginBottom: "4px",
                            color: "#facc15",
                          }}
                        >
                          {idx + 1}. {m}
                        </div>
                        <div style={{ color: "#e5e7eb" }}>
                          {count > 0
                            ? `Heute: ${count} Bild${
                                count > 1 ? "er" : ""
                              } hochgeladen`
                            : "Noch keine Bilder heute"}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Cheat Block */}
                <div
                  style={{
                    marginTop: "14px",
                    paddingTop: "10px",
                    borderTop: "1px dashed rgba(248,113,113,0.8)",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "16px",
                      color: "#f97373",
                      marginBottom: "4px",
                    }}
                  >
                    Cheat Meal
                  </h3>
                  <p style={{ fontSize: "13px", marginBottom: "6px" }}>
                    Maximal <strong>1 Cheat Bild pro Tag</strong>.
                  </p>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "6px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => cheatFileInputRef.current?.click()}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "999px",
                        border: "1px solid #fb7185",
                        background:
                          "linear-gradient(90deg,#fecaca,#fb7185,#b91c1c)",
                        color: "#111111",
                        fontWeight: 600,
                        cursor: "pointer",
                        boxShadow: "0 0 12px rgba(248,113,113,0.45)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Datei wählen
                    </button>

                    <span
                      style={{
                        fontSize: "13px",
                        color: cheatFile ? "#e5e7eb" : "#6b7280",
                      }}
                    >
                      {cheatFile ? cheatFile.name : "Keine Datei gewählt"}
                    </span>

                    <input
                      ref={cheatFileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setCheatFile(file);
                      }}
                    />
                  </div>

                  <button
                    onClick={handleCheatUpload}
                    disabled={isUploadingCheat}
                    style={{
                      width: "100%",
                      padding: "9px 16px",
                      borderRadius: "999px",
                      border: "1px solid #fb7185",
                      background: isUploadingCheat
                        ? "rgba(248,113,113,0.4)"
                        : "linear-gradient(90deg,#fecaca,#fb7185,#b91c1c)",
                      color: "#111111",
                      fontWeight: 700,
                      cursor: isUploadingCheat ? "default" : "pointer",
                      boxShadow: "0 0 18px rgba(248,113,113,0.45)",
                    }}
                  >
                    {isUploadingCheat
                      ? "Wird hochgeladen..."
                      : "Cheat-Mahlzeit hochladen"}
                  </button>

                  <p style={{ marginTop: "6px", fontSize: "13px" }}>
                    {todayCheatCount > 0
                      ? "Heute schon ein Cheat Bild hochgeladen."
                      : "Heute noch kein Cheat Bild."}
                  </p>
                </div>
              </>
            )}
          </section>

          {/* Form Check */}
          <section
            style={{
              padding: "16px",
              borderRadius: "14px",
              background: "#050608",
              border: "1px solid rgba(148,163,184,0.6)",
              boxShadow: "0 0 30px rgba(0,0,0,0.9)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 700 }}>
              Form Check (jeden Sonntag)
            </h2>
            <p style={{ fontSize: "13px", color: "#9ca3af" }}>
              Jeden Sonntag lädst du <strong>drei Bilder</strong> hoch:
              vorne, seitlich, hinten. Maximal ein Form-Check pro Sonntag.
            </p>

            <p
              style={{
                fontSize: "13px",
                color: formCheckDoneToday ? "#facc15" : "#9ca3af",
                marginBottom: "4px",
              }}
            >
              Status heute:{" "}
              {formCheckDoneToday
                ? "Form Check bereits hochgeladen."
                : "Noch kein Form Check heute."}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0,1fr)",
                gap: "8px",
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: "11px",
                    color: "#facc15",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Front
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginTop: "4px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => frontInputRef.current?.click()}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "999px",
                      border: "1px solid #facc15",
                      background: "#000000",
                      color: "#facc15",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    Datei wählen
                  </button>
                  <span
                    style={{
                      fontSize: "13px",
                      color: frontFile ? "#e5e7eb" : "#6b7280",
                    }}
                  >
                    {frontFile ? frontFile.name : "Kein Bild gewählt"}
                  </span>
                  <input
                    ref={frontInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) =>
                      setFrontFile(e.target.files?.[0] || null)
                    }
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    fontSize: "11px",
                    color: "#facc15",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Seitlich
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginTop: "4px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => sideInputRef.current?.click()}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "999px",
                      border: "1px solid #facc15",
                      background: "#000000",
                      color: "#facc15",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    Datei wählen
                  </button>
                  <span
                    style={{
                      fontSize: "13px",
                      color: sideFile ? "#e5e7eb" : "#6b7280",
                    }}
                  >
                    {sideFile ? sideFile.name : "Kein Bild gewählt"}
                  </span>
                  <input
                    ref={sideInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) =>
                      setSideFile(e.target.files?.[0] || null)
                    }
                  />
                </div>
              </div>

              <div>
                <label
                  style={{
                    fontSize: "11px",
                    color: "#facc15",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Hinten
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginTop: "4px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => backInputRef.current?.click()}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "999px",
                      border: "1px solid #facc15",
                      background: "#000000",
                      color: "#facc15",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    Datei wählen
                  </button>
                  <span
                    style={{
                      fontSize: "13px",
                      color: backFile ? "#e5e7eb" : "#6b7280",
                    }}
                  >
                    {backFile ? backFile.name : "Kein Bild gewählt"}
                  </span>
                  <input
                    ref={backInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) =>
                      setBackFile(e.target.files?.[0] || null)
                    }
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleFormCheckUpload}
              disabled={isUploadingForm}
              style={{
                marginTop: "8px",
                width: "100%",
                padding: "10px 16px",
                borderRadius: "999px",
                border: "1px solid rgba(250,204,21,0.7)",
                background: isUploadingForm
                  ? "rgba(250,204,21,0.3)"
                  : "linear-gradient(90deg,#fbbf24,#facc15,#eab308)",
                color: "#111111",
                fontWeight: 700,
                cursor: isUploadingForm ? "default" : "pointer",
                boxShadow: "0 0 20px rgba(250,204,21,0.45)",
                fontSize: "14px",
              }}
            >
              {isUploadingForm
                ? "Form Check wird hochgeladen..."
                : "Form Check hochladen"}
            </button>

            <p
              style={{
                marginTop: "6px",
                fontSize: "12px",
                color: "#9ca3af",
              }}
            >
              Hinweis: Form Check ist primär für <strong>Sonntag</strong>  
               gedacht. Dein Coach nutzt diese Bilder für Langzeit-Updates.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
