"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ClientChatWindow from "@/components/ClientChatWindow";
import {
getUnreadCountForClient,
markMessagesFromCoachAsRead,
} from "@/lib/chatMessages";

// ======================
// TYPES
// ======================

type TrackingEntry = {
id: number;
Datum: string | null;
Gewicht: string | null;
Training: string | null;
Kalorien: string | null;
Email?: string | null;
};

type ClientData = {
ClientID: number;
Name: string;
Ziel: string | null;
Status: string | null;
Plan_Mo?: string | null;
Plan_Di?: string | null;
Plan_Mi?: string | null;
Plan_Do?: string | null;
Plan_Fr?: string | null;
Plan_Sa?: string | null;
Plan_So?: string | null;

TrainingsplanUrl?: string | null;
ErnaehrungsplanUrl?: string | null;

Meals?: string[] | null; // JSONB Feld
Cheat?: string | null;
OnboardingDone?: boolean | null;

subscription_status?: "active" | "past_due" | "canceled" | null;
[key: string]: any;
};

type MealCounts = Record<string, number>;

const getTodayString = () => {
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, "0");
const day = String(now.getDate()).padStart(2, "0");
return `${year}-${month}-${day}`;
};

export default function DashboardPage() {
const router = useRouter();

// session = eingeloggt E-Mail (aus localStorage)
const [session, setSession] = useState<string | null>(null);
const [clientData, setClientData] = useState<ClientData | null>(null);
const [trackingEntries, setTrackingEntries] = useState<TrackingEntry[]>([]);
const [isLoadingClient, setIsLoadingClient] = useState(true);

const [gewicht, setGewicht] = useState("");
const [training, setTraining] = useState("");
const [kalorien, setKalorien] = useState("");

const [today, setToday] = useState(getTodayString());

// Meals / Food (nur für Auswertung / ToDo, Upload ist auf /uploads)
const [mealsFromClient, setMealsFromClient] = useState<string[]>([]);
const [todayMealCounts, setTodayMealCounts] = useState<MealCounts>({});
const [todayCheatCount, setTodayCheatCount] = useState<number>(0);

// Wochen-Fortschritt Ernährung (0–100 %) – aktuell nur intern
const [weeklyProgress, setWeeklyProgress] = useState<number | null>(null);

// Letzte Einträge auf-/zuklappen
const [showEntries, setShowEntries] = useState(false);

// ToDo-Logik (heute erledigt?)
const [todoTrackingDone, setTodoTrackingDone] = useState(false);
const [todoMealsDone, setTodoMealsDone] = useState(false);
const [todoFormcheckDone, setTodoFormcheckDone] = useState(false);
const [isSunday, setIsSunday] = useState(false);

// Chat
const [clientId, setClientId] = useState<number | null>(null);
const [chatOpen, setChatOpen] = useState(false);
const [unreadCount, setUnreadCount] = useState(0);

// =========================
// "SESSION" LADEN (localStorage)
// =========================
useEffect(() => {
const email = localStorage.getItem("client_email");

if (!email) {
router.replace("/login");
return;
}

setSession(email);
fetchClient(email);
fetchTracking(email);
fetchTodayFoodCounts(email);
}, [router]);

// Heutiges Datum minütlich updaten (damit um 00:00 neuer Tag)
useEffect(() => {
const id = setInterval(() => {
setToday(getTodayString());
}, 60 * 1000);
return () => clearInterval(id);
}, []);

// Wenn Meals & Session da sind → Wochenfortschritt berechnen (nur intern)
useEffect(() => {
if (!session) return;
if (!mealsFromClient || mealsFromClient.length === 0) {
setWeeklyProgress(null);
return;
}
fetchWeeklyNutritionProgress(session, mealsFromClient);
}, [session, mealsFromClient, today]);

// =========================
// TODO CHECK LOGIK
// =========================
useEffect(() => {
if (!session) return;

const email = session;
const todayStr = getTodayString();
const weekday = new Date().getDay(); // 0 = Sonntag
setIsSunday(weekday === 0);

const checkTodos = async () => {
// 1️⃣ TRACKING CHECK
const { data: track } = await supabase
.from("Tracking-Tabelle")
.select("*")
.eq("Email", email)
.eq("Datum", todayStr);

setTodoTrackingDone(!!track && track.length > 0);

// 2️⃣ MEALS CHECK
if (!mealsFromClient || mealsFromClient.length === 0) {
setTodoMealsDone(false);
} else {
let mealsComplete = true;

for (const meal of mealsFromClient) {
const { data: imgs } = await supabase
.from("FoodImages")
.select("*")
.eq("Email", email)
.eq("Datum", todayStr)
.eq("Kategorie", meal);

if (!imgs || imgs.length === 0) {
mealsComplete = false;
}
}

setTodoMealsDone(mealsComplete);
}

// 3️⃣ FORMCHECK CHECK (nur Sonntag)
if (weekday === 0) {
const { data: form } = await supabase
.from("Formchecks")
.select("*")
.eq("Email", email)
.eq("Datum", todayStr);

if (form && form.length > 0) {
const f = form[0] as any;
setTodoFormcheckDone(
!!f.FrontUrl && !!f.SideUrl && !!f.BackUrl
);
} else {
setTodoFormcheckDone(false);
}
} else {
setTodoFormcheckDone(false);
}
};

checkTodos();
}, [session, today, mealsFromClient]);

// =========================
// UNREAD BADGE (POLLING)
// =========================
useEffect(() => {
if (!clientId) return;

const loadUnread = async () => {
try {
const count = await getUnreadCountForClient(clientId);
setUnreadCount(count);
} catch (err) {
console.error("Fehler beim Laden der ungelesenen Nachrichten:", err);
}
};

// direkt einmal laden
loadUnread();

// dann alle 2 Sekunden
const id = setInterval(loadUnread, 2000);
return () => clearInterval(id);
}, [clientId]);

// Wenn Chat geöffnet wird → direkt alles vom Coach als gelesen markieren
useEffect(() => {
if (!clientId) return;
if (!chatOpen) return;

const markRead = async () => {
try {
await markMessagesFromCoachAsRead(clientId);
setUnreadCount(0);
} catch (err) {
console.error("Fehler beim Markieren als gelesen (Client-Seite):", err);
}
};

markRead();
}, [chatOpen, clientId]);

// =========================
// KLIENT LADEN
// =========================
const fetchClient = async (email: string) => {
setIsLoadingClient(true);

const { data, error } = await supabase
.from("Klienten")
.select("*")
.eq("Email", email)
.single();

if (error) {
console.log("Client nicht gefunden (DB-Fehler):", error.message);
setClientData(null);
setIsLoadingClient(false);
return;
}

if (!data) {
console.log("Client nicht gefunden: keine Zeilen für", email);
setClientData(null);
setIsLoadingClient(false);
return;
}

const client = data as ClientData;
setClientData(client);

if ((data as any).ClientID) {
setClientId((data as any).ClientID as number);
} else {
setClientId(null);
}

// Falls Onboarding noch nicht fertig → auf /onboarding
if (!client.OnboardingDone) {
setIsLoadingClient(false);
router.replace("/onboarding");
return;
}

if (client.Meals && Array.isArray(client.Meals)) {
setMealsFromClient(client.Meals);
} else {
setMealsFromClient([]);
}

setIsLoadingClient(false);
};

// =========================
// TRACKING LADEN
// =========================
const fetchTracking = async (email: string) => {
const { data, error } = await supabase
.from("Tracking-Tabelle")
.select("*")
.eq("Email", email)
.order("Datum", { ascending: true });

if (error) {
console.log("Tracking Fehler:", error.message);
return;
}

setTrackingEntries((data || []) as TrackingEntry[]);
};

// =========================
// FOOD COUNTS HEUTE
// =========================
const fetchTodayFoodCounts = async (email: string) => {
const { data, error } = await supabase
.from("FoodImages")
.select("Kategorie, Datum")
.eq("Email", email)
.eq("Datum", getTodayString());

if (error) {
console.log("FoodImages Fehler (heute):", error.message);
return;
}

const counts: MealCounts = {};
let cheatCount = 0;

(data || []).forEach((row: any) => {
const kat = row.Kategorie as string;
if (kat === "Cheat") {
cheatCount += 1;
} else {
counts[kat] = (counts[kat] || 0) + 1;
}
});

setTodayMealCounts(counts);
setTodayCheatCount(cheatCount);
};

// =========================
// WOCHEN-FORTSCHRITT ERNÄHRUNG (7 Tage, intern)
// =========================
const fetchWeeklyNutritionProgress = async (
email: string,
meals: string[]
) => {
if (!meals || meals.length === 0) {
setWeeklyProgress(null);
return;
}

const todayStr = getTodayString();
const todayDate = new Date(todayStr);
const fromDate = new Date(todayDate);
fromDate.setDate(fromDate.getDate() - 6); // letzten 7 Tage inkl. heute

const fromStr = fromDate.toISOString().split("T")[0];

const { data, error } = await supabase
.from("FoodImages")
.select("Kategorie, Datum")
.eq("Email", email)
.gte("Datum", fromStr)
.lte("Datum", todayStr);

if (error) {
console.log("FoodImages Fehler (Woche):", error.message);
setWeeklyProgress(null);
return;
}

const perDay: Record<
string,
{ normalCount: number; cheatCount: number }
> = {};

(data || []).forEach((row: any) => {
const dateStr = row.Datum as string;
const kat = row.Kategorie as string;

if (!perDay[dateStr]) {
perDay[dateStr] = { normalCount: 0, cheatCount: 0 };
}

if (kat === "Cheat") {
perDay[dateStr].cheatCount += 1;
} else {
perDay[dateStr].normalCount += 1;
}
});

const totalMealsPlanned = meals.length;
if (totalMealsPlanned <= 0) {
setWeeklyProgress(null);
return;
}

let mealScoreSum = 0;
let totalCheatImages = 0;

for (let i = 0; i < 7; i++) {
const d = new Date(fromDate);
d.setDate(fromDate.getDate() + i);
const dateStr = d.toISOString().split("T")[0];

const info = perDay[dateStr];
if (info) {
const goodMeals = Math.min(info.normalCount, totalMealsPlanned);
const dailyRatio = goodMeals / totalMealsPlanned; // 0–1
mealScoreSum += dailyRatio;
totalCheatImages += info.cheatCount;
} else {
mealScoreSum += 0;
}
}

const avgMealPercent = (mealScoreSum / 7) * 100; // 0–100 %
const penalty = totalCheatImages * 5; // -5 % pro Cheat Bild
const finalScore = Math.max(
0,
Math.min(100, Math.round(avgMealPercent - penalty))
);

setWeeklyProgress(finalScore);
};

// =========================
// EINTRAG SPEICHERN (1x/Tag)
// =========================
const saveEntry = async () => {
if (!session) return;
const email = session;

const alreadyExists = trackingEntries.some((e) => e.Datum === today);
if (alreadyExists) {
alert("Du hast heute bereits einen Eintrag gemacht!");
return;
}

const { error } = await supabase.from("Tracking-Tabelle").insert([
{
Email: email,
Gewicht: gewicht,
Training: training,
Kalorien: kalorien,
Datum: today,
},
]);

if (error) {
console.log("Speicherfehler:", error.message);
return;
}

await fetchTracking(email);
setGewicht("");
setTraining("");
setKalorien("");
};

// =========================
// LOGOUT
// =========================
const logout = () => {
localStorage.removeItem("client_email");
router.replace("/login");
};

// =========================
// GEWICHTS-CHART DATEN
// =========================
const weightPoints = trackingEntries
.filter((e) => e.Gewicht && !isNaN(parseFloat(e.Gewicht)))
.map((e) => ({
date: e.Datum,
weight: parseFloat(e.Gewicht as string),
}))
.sort((a, b) => {
if (!a.date || !b.date) return 0;
return new Date(a.date).getTime() - new Date(b.date).getTime();
});

const hasWeightData = weightPoints.length > 0;
const minWeight = hasWeightData
? Math.min(...weightPoints.map((p) => p.weight))
: 0;
const maxWeight = hasWeightData
? Math.max(...weightPoints.map((p) => p.weight))
: 0;

const chartWidth = 520;
const chartHeight = 240;
const padding = 45;

const getChartPointString = () => {
if (!hasWeightData) return "";

const range = maxWeight - minWeight || 1;

return weightPoints
.map((p, index) => {
const x =
padding +
((chartWidth - 2 * padding) *
(weightPoints.length === 1 ? 0.5 : index / (weightPoints.length - 1)));

const normalized = (p.weight - minWeight) / range;
const y =
chartHeight - padding - normalized * (chartHeight - 2 * padding);

return `${x},${y}`;
})
.join(" ");
};

// =========================
// WOCHENPLAN / FARBE
// =========================
const days = [
{ key: "Plan_Mo", label: "Mo", index: 0 },
{ key: "Plan_Di", label: "Di", index: 1 },
{ key: "Plan_Mi", label: "Mi", index: 2 },
{ key: "Plan_Do", label: "Do", index: 3 },
{ key: "Plan_Fr", label: "Fr", index: 4 },
{ key: "Plan_Sa", label: "Sa", index: 5 },
{ key: "Plan_So", label: "So", index: 6 },
];

const getEntryForWeekday = (
weekdayIndexMon0: number
): TrackingEntry | null => {
if (!trackingEntries.length) return null;

const now = new Date();
const nowMs = now.getTime();

const candidates = trackingEntries.filter((e) => {
if (!e.Datum) return false;
const d = new Date(e.Datum);
const jsDay = d.getDay(); // 0=So,1=Mo,...6=Sa
const monIndex = (jsDay + 6) % 7; // 0=Mo,...6=So

if (monIndex !== weekdayIndexMon0) return false;

const diffDays = (nowMs - d.getTime()) / (1000 * 60 * 60 * 24);
return diffDays >= 0 && diffDays < 7;
});

if (!candidates.length) return null;

candidates.sort((a, b) => {
if (!a.Datum || !b.Datum) return 0;
return new Date(b.Datum).getTime() - new Date(a.Datum).getTime();
});

return candidates[0];
};

const getTrainingColor = (dayKey: string, weekdayIndex: number) => {
if (!clientData) return "#3f3f46";

const plan = clientData[dayKey];
const entry = getEntryForWeekday(weekdayIndex);

if (!entry || !entry.Training) return "#3f3f46";
if (!plan) return "#3f3f46";

if (plan.toLowerCase() === entry.Training.toLowerCase())
return "rgb(34,197,94)";
return "rgb(239,68,68)";
};

const totalImagesToday =
Object.values(todayMealCounts).reduce((sum, c) => sum + c, 0) +
todayCheatCount;

// =========================
// RENDER
// =========================

if (isLoadingClient) {
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
maxWidth: "1000px",
margin: "0 auto",
background: "rgba(0,0,0,0.95)",
borderRadius: "16px",
padding: "24px",
boxShadow: "0 20px 50px rgba(0,0,0,0.9)",
border: "1px solid rgba(255,215,0,0.25)",
}}
>
<p style={{ fontSize: "16px" }}>Lade dein Dashboard...</p>
</div>
</div>
);
}

return (
<div
style={{
minHeight: "100vh",
background: "radial-gradient(circle at top left,#050505,#000000)",
color: "white",
padding: "40px 16px",
}}
>
{/* CHAT-FENSTER */}
{clientId && chatOpen && (
<ClientChatWindow
clientId={clientId}
clientEmail={session ?? ""}
onClose={() => {
setChatOpen(false);
if (clientId) {
// Beim Schließen noch einmal alles vom Coach als gelesen markieren
markMessagesFromCoachAsRead(clientId)
.then(() => setUnreadCount(0))
.catch((err) =>
console.error(
"Fehler beim Markieren als gelesen beim Schließen:",
err
)
);
}
}}
/>
)}

<div
style={{
maxWidth: "1000px",
margin: "0 auto",
background: "rgba(0,0,0,0.95)",
borderRadius: "16px",
padding: "24px",
boxShadow: "0 20px 50px rgba(0,0,0,0.9)",
border: "1px solid rgba(255,215,0,0.25)",
}}
>
{/* HEADER */}
<header
style={{
display: "flex",
justifyContent: "space-between",
alignItems: "center",
marginBottom: "24px",
gap: "12px",
}}
>
<div>
<h1 style={{ fontSize: "28px", marginBottom: "4px" }}>
Dein Dashboard
</h1>
{session && (
<p style={{ fontSize: "14px", color: "#e5e7eb" }}>
Du bist eingeloggt als:{" "}
<span style={{ fontWeight: 600 }}>{session}</span>
</p>
)}
</div>

<div style={{ display: "flex", gap: "8px" }}>
<button
onClick={() => router.push("/trainingsplan")}
style={{
padding: "8px 16px",
borderRadius: "999px",
border: "1px solid #FFD700",
background:
"linear-gradient(90deg, #fbbf24 0%, #facc15 40%, #eab308 100%)",
color: "#f9fafb",
fontWeight: 600,
cursor: "pointer",
boxShadow: "0 0 15px rgba(250,204,21,0.45)",
fontSize: "13px",
whiteSpace: "nowrap",
}}
>
Trainingsplan
</button>

<button
onClick={() => router.push("/ernaehrungsplan")}
style={{
padding: "8px 16px",
borderRadius: "999px",
border: "1px solid #FFD700",
background:
"linear-gradient(90deg, #fbbf24 0%, #facc15 40%, #eab308 100%)",
color: "#f9fafb",
fontWeight: 600,
cursor: "pointer",
boxShadow: "0 0 15px rgba(250,204,21,0.45)",
fontSize: "13px",
whiteSpace: "nowrap",
}}
>
Ernährungsplan
</button>

<button
onClick={() => router.push("/uploads")}
style={{
padding: "8px 16px",
borderRadius: "999px",
border: "1px solid #FFD700",
background: "#000000",
color: "#FFD700",
fontWeight: 600,
cursor: "pointer",
boxShadow: "0 0 15px rgba(255,215,0,0.4)",
fontSize: "13px",
whiteSpace: "nowrap",
}}
>
Uploads
</button>

<button
onClick={logout}
style={{
padding: "8px 16px",
borderRadius: "999px",
border: "1px solid #FFD700",
background: "#000000",
color: "#FFD700",
fontWeight: 600,
cursor: "pointer",
boxShadow: "0 0 15px rgba(255,215,0,0.4)",
fontSize: "13px",
whiteSpace: "nowrap",
}}
>
Logout
</button>
</div>
</header>

{/* TODO BOX */}
<div
style={{
background: "#050505",
border: "1px solid #facc15",
padding: "18px",
borderRadius: "12px",
marginBottom: "22px",
color: "white",
}}
>
<h2 style={{ fontSize: "18px", marginBottom: "10px" }}>
Deine heutigen Aufgaben
</h2>

<p>
Tracking eintragen:
<span
style={{
color: todoTrackingDone ? "lime" : "red",
fontWeight: 700,
marginLeft: 6,
}}
>
{todoTrackingDone ? "✔️ erledigt" : "❌ offen"}
</span>
</p>

<p>
Mahlzeiten hochladen:
<span
style={{
color: todoMealsDone ? "lime" : "red",
fontWeight: 700,
marginLeft: 6,
}}
>
{todoMealsDone ? "✔️ erledigt" : "❌ offen"}
</span>
</p>

{isSunday && (
<p>
Formcheck (Sonntag):
<span
style={{
color: todoFormcheckDone ? "lime" : "red",
fontWeight: 700,
marginLeft: 6,
}}
>
{todoFormcheckDone ? "✔️ erledigt" : "❌ offen"}
</span>
</p>
)}
</div>

{/* GRID LAYOUT */}
<div
style={{
display: "grid",
gridTemplateColumns: "1.2fr 1fr",
gap: "24px",
}}
>
{/* LINKE SPALTE */}
<div
style={{ display: "flex", flexDirection: "column", gap: "24px" }}
>
{/* TRACKING */}
<section
style={{
padding: "16px",
borderRadius: "12px",
background: "#050608",
border: "1px solid rgba(255,215,0,0.18)",
}}
>
<h2 style={{ fontSize: "20px", marginBottom: "12px" }}>
Tracking eintragen
</h2>

<div
style={{
display: "flex",
flexDirection: "column",
gap: "8px",
}}
>
<label
style={{
fontSize: "11px",
color: "#facc15",
letterSpacing: "0.05em",
textTransform: "uppercase",
}}
>
Datum (heute)
</label>
<input
type="date"
value={today}
disabled
style={{
padding: "8px 10px",
borderRadius: "8px",
border: "1px solid rgba(255,215,0,0.35)",
backgroundColor: "#020202",
color: "white",
}}
/>

<input
placeholder="Gewicht (kg)"
value={gewicht}
onChange={(e) => setGewicht(e.target.value)}
style={{
padding: "8px 10px",
borderRadius: "8px",
border: "1px solid rgba(255,215,0,0.2)",
backgroundColor: "#020202",
color: "white",
}}
/>

<input
placeholder="Training (z.B. Push, Pull, Rest)"
value={training}
onChange={(e) => setTraining(e.target.value)}
style={{
padding: "8px 10px",
borderRadius: "8px",
border: "1px solid rgba(255,215,0,0.2)",
backgroundColor: "#020202",
color: "white",
}}
/>

<input
placeholder="Kalorien"
value={kalorien}
onChange={(e) => setKalorien(e.target.value)}
style={{
padding: "8px 10px",
borderRadius: "8px",
border: "1px solid rgba(255,215,0,0.2)",
backgroundColor: "#020202",
color: "white",
}}
/>

<button
onClick={saveEntry}
style={{
marginTop: "8px",
marginBottom: "16px",
padding: "10px 16px",
borderRadius: "999px",
border: "1px solid #FFD700",
background:
"linear-gradient(90deg, #fbbf24 0%, #facc15 40%, #eab308 100%)",
color: "#111111",
fontWeight: 700,
cursor: "pointer",
boxShadow: "0 0 18px rgba(250,204,21,0.4)",
}}
>
Eintrag speichern
</button>
</div>
</section>


</div>

{/* RECHTE SPALTE */}
<div
style={{ display: "flex", flexDirection: "column", gap: "24px" }}
>
{/* GEWICHTSCHART */}
<section
style={{
padding: "16px",
borderRadius: "12px",
background: "#050608",
border: "1px solid rgba(255,215,0,0.18)",
marginTop: "32px",
}}
>
<h2 style={{ fontSize: "20px", marginBottom: "12px" }}>
Gewichtsentwicklung
</h2>

{hasWeightData ? (
<div style={{ overflowX: "auto" }}>
<svg
width={chartWidth}
height={chartHeight}
style={{ maxWidth: "100%", background: "#050608" }}
>
{/* Achsen */}
<line
x1={padding}
y1={chartHeight - padding}
x2={chartWidth - padding}
y2={chartHeight - padding}
stroke="#ffffff"
strokeWidth={1.2}
/>
<line
x1={padding}
y1={padding}
x2={padding}
y2={chartHeight - padding}
stroke="#ffffff"
strokeWidth={1.2}
/>

{/* Linie */}
<polyline
fill="none"
stroke="#FFD700"
strokeWidth={3}
points={getChartPointString()}
/>

{/* Punkte */}
{weightPoints.map((p, index) => {
const range = maxWeight - minWeight || 1;
const x =
padding +
((chartWidth - 2 * padding) *
(weightPoints.length === 1
? 0.5
: index / (weightPoints.length - 1)));

const norm = (p.weight - minWeight) / range;
const y =
chartHeight -
padding -
norm * (chartHeight - 2 * padding);

return (
<g key={index}>
<circle cx={x} cy={y} r={4} fill="#FFD700" />
<text
x={x}
y={y - 8}
fontSize="10"
textAnchor="middle"
fill="#ffffff"
>
{p.weight.toFixed(1)}
</text>
</g>
);
})}

{/* Y-Achse */}
<text
x={padding - 8}
y={padding + 4}
fontSize="10"
textAnchor="end"
fill="#ffffff"
>
{maxWeight.toFixed(1)} kg
</text>
<text
x={padding - 8}
y={chartHeight - padding + 4}
fontSize="10"
textAnchor="end"
fill="#ffffff"
>
{minWeight.toFixed(1)} kg
</text>

{/* X-Achse */}
{weightPoints.map((p, index) => {
const x =
padding +
((chartWidth - 2 * padding) *
(weightPoints.length === 1
? 0.5
: index / (weightPoints.length - 1)));

return (
<text
key={index}
x={x}
y={chartHeight - padding + 18}
fontSize="9"
textAnchor="middle"
fill="#ffffff"
>
{p.date}
</text>
);
})}
</svg>
</div>
) : (
<p style={{ fontSize: "14px" }}>
Noch keine Gewichtseinträge vorhanden.
</p>
)}
</section>

{/* WOCHENPLAN */}
<section
style={{
padding: "16px",
borderRadius: "12px",
background: "#050608",
border: "1px solid rgba(255,215,0,0.18)",
}}
>
<h2 style={{ fontSize: "20px", marginBottom: "12px" }}>
Wochenplan & Umsetzung
</h2>

{!clientData ? (
<p style={{ fontSize: "14px" }}>Kein Klient gefunden.</p>
) : (
<div
style={{
display: "grid",
gridTemplateColumns: "repeat(7, minmax(0,1fr))",
gap: "8px",
fontSize: "12px",
}}
>
{days.map((d) => {
const plan = clientData?.[d.key] ?? "-";
const entry = getEntryForWeekday(d.index);
const color = getTrainingColor(d.key, d.index);

return (
<div
key={d.key}
style={{
padding: "8px 6px",
borderRadius: "10px",
backgroundColor: color,
color: "white",
textAlign: "center",
minHeight: "70px",
display: "flex",
flexDirection: "column",
justifyContent: "space-between",
boxShadow: "0 0 8px rgba(0,0,0,0.6)",
}}
>
<div
style={{
fontWeight: 800,
marginBottom: "4px",
letterSpacing: "0.08em",
fontSize: "11px",
textTransform: "uppercase",
}}
>
{d.label}
</div>
<div
style={{
fontSize: "11px",
minHeight: "16px",
fontWeight: 700,
}}
>
{plan}
</div>
<div
style={{
fontSize: "11px",
opacity: 0.95,
minHeight: "16px",
}}
>
{entry?.Training ?? "-"}
</div>
</div>
);
})}
</div>
)}
</section>

{/* LETZTE EINTRÄGE */}
<section
style={{
padding: "16px",
borderRadius: "12px",
background: "#050608",
border: "1px solid rgba(255,215,0,0.18)",
}}
>
<div
style={{
display: "flex",
justifyContent: "space-between",
alignItems: "center",
cursor: "pointer",
}}
onClick={() => setShowEntries((prev) => !prev)}
>
<h2 style={{ fontSize: "20px" }}>Letzte Einträge</h2>
<span style={{ fontSize: "18px" }}>
{showEntries ? "▲" : "▼"}
</span>
</div>

{showEntries ? (
trackingEntries.length > 0 ? (
<div
style={{
marginTop: "12px",
maxHeight: "260px",
overflowY: "auto",
}}
>
{[...trackingEntries]
.slice()
.reverse()
.map((entry) => (
<div
key={entry.id}
style={{
padding: "8px 0",
borderBottom:
"1px solid rgba(55,65,81,0.8)",
fontSize: "14px",
}}
>
<p>
<strong>Datum:</strong> {entry.Datum}
</p>
<p>
<strong>Gewicht:</strong> {entry.Gewicht}
</p>
<p>
<strong>Training:</strong> {entry.Training}
</p>
<p>
<strong>Kalorien:</strong> {entry.Kalorien}
</p>
</div>
))}
</div>
) : (
<p style={{ marginTop: "8px", fontSize: "14px" }}>
Noch keine Einträge.
</p>
)
) : null}
</section>
</div>
</div>

{/* FOOTER */}
<div
style={{
marginTop: "20px",
paddingTop: "12px",
borderTop: "1px solid rgba(31,41,55,0.9)",
display: "flex",
justifyContent: "space-between",
alignItems: "center",
fontSize: "12px",
color: "#9ca3af",
}}
>
<span>EliteShred Client Dashboard</span>
<button
onClick={() => router.push("/client-info")}
style={{
padding: "6px 12px",
borderRadius: "999px",
border: "1px solid rgba(255,215,0,0.45)",
background: "transparent",
color: "#facc15",
fontWeight: 500,
cursor: "pointer",
fontSize: "12px",
}}
>
Wie funktioniert das Dashboard?
</button>
<div
style={{
marginTop: "24px",
display: "flex",
justifyContent: "center",
}}
>
<button
type="button"
onClick={() => router.push("/hilfe")}
style={{
padding: "10px 18px",
borderRadius: "999px",
border: "1px solid #facc15",
background:
"linear-gradient(90deg,#fbbf24,#facc15,#eab308)",
color: "#111827",
fontSize: "13px",
fontWeight: 700,
cursor: "pointer",
}}
>
Hilfe & Support
</button>
</div>
</div>
</div>

{/* FLOATING CHAT BUTTON */}
<div
style={{
position: "fixed",
bottom: "24px",
right: "24px",
zIndex: 9999,
}}
>
<button
type="button"
onClick={() => setChatOpen(true)}
style={{
padding: "14px 22px",
borderRadius: "999px",
border: "1px solid #facc15",
background: "linear-gradient(90deg,#fbbf24,#facc15,#eab308)",
color: "#111827",
fontSize: "15px",
fontWeight: 700,
cursor: "pointer",
boxShadow: "0 0 18px rgba(250,204,21,0.45)",
position: "relative",
}}
>
💬 Chat mit Coach
{unreadCount > 0 && (
<span
style={{
position: "absolute",
top: "-6px",
right: "-6px",
background: "red",
color: "white",
borderRadius: "999px",
padding: "4px 8px",
fontSize: "12px",
fontWeight: 700,
}}
>
{unreadCount}
</span>
)}
</button>
</div>

{/* PAYMENT LOCKED OVERLAY */}
{clientData?.subscription_status !== "active" && (
<div
style={{
position: "fixed",
top: 0,
left: 0,
width: "100vw",
height: "100vh",
background: "rgba(0,0,0,0.90)",
backdropFilter: "blur(4px)",
zIndex: 999999,
display: "flex",
flexDirection: "column",
alignItems: "center",
justifyContent: "center",
padding: "30px",
textAlign: "center",
}}
>
<h1
style={{
fontSize: "28px",
color: "white",
marginBottom: "16px",
}}
>
Zahlung erforderlich
</h1>
<p
style={{
fontSize: "16px",
color: "#ccc",
maxWidth: "340px",
}}
>
Deine Zahlung konnte nicht verarbeitet werden. Bitte aktualisiere
deine Zahlungsdaten, um deinen Zugang weiterhin nutzen zu können.
</p>

<button
style={{
marginTop: "24px",
padding: "12px 20px",
borderRadius: "999px",
border: "1px solid #facc15",
background:
"linear-gradient(90deg,#fbbf24,#facc15,#eab308)",
color: "#111827",
fontSize: "15px",
fontWeight: 700,
cursor: "pointer",
boxShadow: "0 0 20px rgba(250,204,21,0.45)",
}}
onClick={() => {
window.location.href = "https://billing.stripe.com/p/login/6oU00j28I4qU7qZ2fraMU00";
}}
>
Zahlung aktualisieren
</button>
</div>
)}
</div>
);
}