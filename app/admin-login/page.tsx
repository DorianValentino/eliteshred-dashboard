"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ChatPanel from "@/components/ChatPanel";
import ChatWindow from "@/components/ChatWindow";
import { Client } from "@/types/Client";

export default function AdminDashboardPage() {
const router = useRouter();

const [clients, setClients] = useState<Client[]>([]);
const [loading, setLoading] = useState(true);
const [errorMsg, setErrorMsg] = useState<string | null>(null);
const [activatingId, setActivatingId] = useState<number | null>(null);

const [count11, setCount11] = useState(0);
const [count16, setCount16] = useState(0);
const [count16R, setCount16R] = useState(0);
const [countMonthly, setCountMonthly] = useState(0);

const [activePackageFilter, setActivePackageFilter] =
useState<string | null>(null);

// CHAT
const [chatPanelOpen, setChatPanelOpen] = useState(false);
const [activeChatClient, setActiveChatClient] = useState<Client | null>(null);

// =========================
// KLIENTEN LADEN
// =========================
const loadClients = async () => {
setLoading(true);
setErrorMsg(null);

const { data, error } = await supabase
.from("Klienten")
.select("*")
.order("ClientID", { ascending: true });

if (error) {
console.log("Admin: Fehler beim Laden der Klienten:", error.message);
setErrorMsg("Fehler beim Laden der Klienten.");
setLoading(false);
return;
}

const list = (data || []) as Client[];
setClients(list);

setCount11(list.filter((c) => c.Paket === "1:1").length);
setCount16(list.filter((c) => c.Paket === "16").length);
setCount16R(list.filter((c) => c.Paket === "16R").length);
setCountMonthly(list.filter((c) => c.Paket === "Monthly").length);

setLoading(false);
};

useEffect(() => {
loadClients();
}, []);

// =========================
// WARTENDE KLIENTEN
// =========================
const waitingClients = clients.filter(
(c) => c.OnboardingDone === true && c.IsActivated !== true
);

const handleActivate = async (clientId: number) => {
setErrorMsg(null);
setActivatingId(clientId);

const { error } = await supabase
.from("Klienten")
.update({ IsActivated: true })
.eq("ClientID", clientId);

if (error) {
console.log("Aktivierungsfehler:", error);
setErrorMsg(`Fehler beim Aktivieren: ${error.message}`);
} else {
setClients((prev) =>
prev.map((c) =>
c.ClientID === clientId ? { ...c, IsActivated: true } : c
)
);
}

setActivatingId(null);
};

// =========================
// FILTER
// =========================
const togglePackageFilter = (paket: string) => {
setActivePackageFilter((current) => (current === paket ? null : paket));
};

const visibleClients =
activePackageFilter === null
? clients
: clients.filter((c) => c.Paket === activePackageFilter);

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
{/* CHAT FENSTER (COACH ↔ KLIENT) */}
{activeChatClient && (
<ChatWindow
client={activeChatClient}
onClose={() => setActiveChatClient(null)}
/>
)}

{/* CHAT PANEL (LISTE 16/16R/Monthly) */}
{chatPanelOpen && (
<ChatPanel
clients={clients}
onClose={() => setChatPanelOpen(false)}
onSelectClient={(client) => {
setActiveChatClient(client);
setChatPanelOpen(false);
}}
/>
)}

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
marginBottom: "24px",
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
EliteShred Admin
</div>
<h1 style={{ fontSize: "26px", fontWeight: 700 }}>
Coach Dashboard
</h1>
<p
style={{
fontSize: "13px",
color: "#9ca3af",
marginTop: "4px",
}}
>
Übersicht über alle Klienten & Pakete.
</p>
</div>

<button
onClick={() => setChatPanelOpen(true)}
style={{
padding: "8px 14px",
borderRadius: "8px",
background: "#facc15",
color: "#111",
fontWeight: 700,
cursor: "pointer",
}}
>
Chat
</button>
</header>

{/* FEHLERBOX */}
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

{/* PAKET-STATS */}
<section style={{ marginBottom: "22px" }}>
<h2
style={{
fontSize: "18px",
marginBottom: "10px",
fontWeight: 600,
}}
>
Coaching-Pakete
</h2>

<div
style={{
display: "grid",
gridTemplateColumns: "repeat(4,minmax(0,1fr))",
gap: "12px",
}}
>
{/* 1:1 */}
<button
type="button"
onClick={() => {
togglePackageFilter("1:1");
router.push(`/admin/paket/${encodeURIComponent("1:1")}`);
}}
style={{
padding: "14px 12px",
borderRadius: "12px",
background:
activePackageFilter === "1:1"
? "linear-gradient(135deg,#111111,#1f1f1f)"
: "linear-gradient(135deg,#050505,#151515)",
border:
activePackageFilter === "1:1"
? "1px solid rgba(255,215,0,0.9)"
: "1px solid rgba(255,215,0,0.35)",
cursor: "pointer",
textAlign: "left",
}}
>
<div
style={{
fontSize: "11px",
textTransform: "uppercase",
letterSpacing: "0.12em",
color: "#facc15",
marginBottom: "4px",
}}
>
1:1 Klienten
</div>
<div
style={{
fontSize: "24px",
fontWeight: 700,
color: "#ffffff",
}}
>
{count11}
</div>
{activePackageFilter === "1:1" && (
<div
style={{
fontSize: "11px",
marginTop: "4px",
color: "#e5e7eb",
}}
>
Filter aktiv
</div>
)}
</button>

{/* 16 */}
<button
type="button"
onClick={() => {
togglePackageFilter("16");
router.push(`/admin/paket/${encodeURIComponent("16")}`);
}}
style={{
padding: "14px 12px",
borderRadius: "12px",
background:
activePackageFilter === "16"
? "linear-gradient(135deg,#111111,#1f1f1f)"
: "linear-gradient(135deg,#050505,#151515)",
border:
activePackageFilter === "16"
? "1px solid rgba(255,215,0,0.9)"
: "1px solid rgba(255,215,0,0.35)",
cursor: "pointer",
textAlign: "left",
}}
>
<div
style={{
fontSize: "11px",
textTransform: "uppercase",
letterSpacing: "0.12em",
color: "#facc15",
marginBottom: "4px",
}}
>
16 Klienten
</div>
<div
style={{
fontSize: "24px",
fontWeight: 700,
color: "#ffffff",
}}
>
{count16}
</div>
{activePackageFilter === "16" && (
<div
style={{
fontSize: "11px",
marginTop: "4px",
color: "#e5e7eb",
}}
>
Filter aktiv
</div>
)}
</button>

{/* 16R */}
<button
type="button"
onClick={() => {
togglePackageFilter("16R");
router.push(`/admin/paket/${encodeURIComponent("16R")}`);
}}
style={{
padding: "14px 12px",
borderRadius: "12px",
background:
activePackageFilter === "16R"
? "linear-gradient(135deg,#111111,#1f1f1f)"
: "linear-gradient(135deg,#050505,#151515)",
border:
activePackageFilter === "16R"
? "1px solid rgba(255,215,0,0.9)"
: "1px solid rgba(255,215,0,0.35)",
cursor: "pointer",
textAlign: "left",
}}
>
<div
style={{
fontSize: "11px",
textTransform: "uppercase",
letterSpacing: "0.12em",
color: "#facc15",
marginBottom: "4px",
}}
>
16R Klienten
</div>
<div
style={{
fontSize: "24px",
fontWeight: 700,
color: "#ffffff",
}}
>
{count16R}
</div>
{activePackageFilter === "16R" && (
<div
style={{
fontSize: "11px",
marginTop: "4px",
color: "#e5e7eb",
}}
>
Filter aktiv
</div>
)}
</button>

{/* Monthly */}
<button
type="button"
onClick={() => {
togglePackageFilter("Monthly");
router.push(`/admin/paket/${encodeURIComponent("Monthly")}`);
}}
style={{
padding: "14px 12px",
borderRadius: "12px",
background:
activePackageFilter === "Monthly"
? "linear-gradient(135deg,#111111,#1f1f1f)"
: "linear-gradient(135deg,#050505,#151515)",
border:
activePackageFilter === "Monthly"
? "1px solid rgba(255,215,0,0.9)"
: "1px solid rgba(255,215,0,0.35)",
cursor: "pointer",
textAlign: "left",
}}
>
<div
style={{
fontSize: "11px",
textTransform: "uppercase",
letterSpacing: "0.12em",
color: "#facc15",
marginBottom: "4px",
}}
>
Monthly Klienten
</div>
<div
style={{
fontSize: "24px",
fontWeight: 700,
color: "#ffffff",
}}
>
{countMonthly}
</div>
{activePackageFilter === "Monthly" && (
<div
style={{
fontSize: "11px",
marginTop: "4px",
color: "#e5e7eb",
}}
>
Filter aktiv
</div>
)}
</button>
</div>
</section>

{/* WARTENDE KLIENTEN */}
<section
style={{
marginBottom: "24px",
padding: "16px",
borderRadius: "14px",
background: "#050505",
border: "1px solid rgba(250,204,21,0.35)",
}}
>
<div
style={{
display: "flex",
justifyContent: "space-between",
gap: "12px",
marginBottom: "10px",
alignItems: "center",
}}
>
<div>
<h2 style={{ fontSize: "18px", marginBottom: "4px" }}>
Wartende Klienten
</h2>
<p style={{ fontSize: "13px", color: "#9ca3af" }}>
Onboarding fertig, aber noch nicht freigeschaltet.
</p>
</div>
<div
style={{
fontSize: "12px",
padding: "4px 10px",
borderRadius: "999px",
border: "1px solid rgba(250,204,21,0.7)",
color: "#facc15",
}}
>
{waitingClients.length} offen
</div>
</div>

{waitingClients.length === 0 ? (
<p style={{ fontSize: "13px", color: "#9ca3af" }}>
Aktuell keine wartenden Klienten.
</p>
) : (
<div
style={{
display: "flex",
flexDirection: "column",
gap: "10px",
}}
>
{waitingClients.map((c) => (
<div
key={c.ClientID}
style={{
display: "flex",
justifyContent: "space-between",
alignItems: "center",
padding: "10px 12px",
borderRadius: "10px",
background:
"linear-gradient(135deg,#050505,#111111,#050505)",
border: "1px solid rgba(82,82,82,0.8)",
}}
>
<div>
<div style={{ fontSize: "14px", fontWeight: 600 }}>
{c.Name || "Ohne Name"}
</div>
<div
style={{
fontSize: "12px",
color: "#9ca3af",
marginTop: "2px",
}}
>
{c.Email} • Paket: {c.Paket || "-"}
</div>
</div>

<button
onClick={() => handleActivate(c.ClientID)}
disabled={activatingId === c.ClientID}
style={{
padding: "8px 14px",
borderRadius: "999px",
border: "1px solid #facc15",
background:
"linear-gradient(90deg,#fbbf24,#facc15,#eab308)",
color: "#111827",
fontSize: "13px",
fontWeight: 700,
cursor:
activatingId === c.ClientID ? "default" : "pointer",
boxShadow: "0 0 14px rgba(250,204,21,0.55)",
opacity: activatingId === c.ClientID ? 0.7 : 1,
}}
>
{activatingId === c.ClientID
? "Aktiviere..."
: "Klient aktivieren"}
</button>
</div>
))}
</div>
)}
</section>

{/* ALLE KLIENTEN */}
<section>
<div
style={{
display: "flex",
justifyContent: "space-between",
alignItems: "center",
marginBottom: "10px",
gap: "8px",
}}
>
<h2
style={{
fontSize: "18px",
fontWeight: 600,
}}
>
Klientenübersicht
</h2>

{activePackageFilter && (
<button
type="button"
onClick={() => setActivePackageFilter(null)}
style={{
padding: "6px 10px",
borderRadius: "999px",
border: "1px solid rgba(148,163,184,0.7)",
background: "transparent",
color: "#e5e7eb",
fontSize: "12px",
cursor: "pointer",
}}
>
Filter entfernen ({activePackageFilter})
</button>
)}
</div>

{loading ? (
<p style={{ fontSize: "13px" }}>Lade Klienten...</p>
) : visibleClients.length === 0 ? (
<p style={{ fontSize: "13px" }}>
Keine Klienten für diesen Filter gefunden.
</p>
) : (
<div
style={{
overflowX: "auto",
borderRadius: "12px",
border: "1px solid rgba(38,38,38,0.95)",
}}
>
<table
style={{
width: "100%",
borderCollapse: "collapse",
fontSize: "13px",
}}
>
<thead>
<tr
style={{
background: "#050505",
borderBottom: "1px solid rgba(38,38,38,1)",
color: "#facc15",
}}
>
<th
style={{
textAlign: "left",
padding: "8px 10px",
fontWeight: 600,
}}
>
ID
</th>
<th
style={{
textAlign: "left",
padding: "8px 10px",
fontWeight: 600,
}}
>
Name
</th>
<th
style={{
textAlign: "left",
padding: "8px 10px",
fontWeight: 600,
}}
>
E-Mail
</th>
<th
style={{
textAlign: "left",
padding: "8px 10px",
fontWeight: 600,
}}
>
Paket
</th>
<th
style={{
textAlign: "left",
padding: "8px 10px",
fontWeight: 600,
}}
>
Aktiv
</th>
<th
style={{
textAlign: "left",
padding: "8px 10px",
fontWeight: 600,
}}
>
Onboarding
</th>
</tr>
</thead>
<tbody>
{visibleClients.map((c) => (
<tr
key={c.ClientID}
style={{
borderBottom: "1px solid rgba(31,31,31,0.95)",
}}
>
<td style={{ padding: "8px 10px" }}>{c.ClientID}</td>
<td style={{ padding: "8px 10px" }}>{c.Name}</td>
<td style={{ padding: "8px 10px" }}>{c.Email}</td>
<td style={{ padding: "8px 10px" }}>{c.Paket}</td>
<td style={{ padding: "8px 10px" }}>
{c.IsActivated ? "Ja" : "Nein"}
</td>
<td style={{ padding: "8px 10px" }}>
{c.OnboardingDone ? "Fertig" : "Offen"}
</td>
</tr>
))}
</tbody>
</table>
</div>
)}
</section>
</div>
</div>
);
}