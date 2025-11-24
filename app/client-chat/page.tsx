"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ClientChatWindow from "@/components/ClientChatWindow";

export default function ClientChatPage() {
const router = useRouter();


const [clientEmail, setClientEmail] = useState<string>("");
const [clientId, setClientId] = useState<number | null>(null);
const [loading, setLoading] = useState(true);
const fetchClient = async () => {
setLoading(true);

const email = sessionStorage.getItem("client_email") || localStorage.getItem("client_email");

if (!email) {
setLoading(false);
return;
}

const { data, error } = await supabase
.from("Klienten")
.select("ClientID")
.eq("Email", email)
.single();

if (error || !data) {
console.log("Fehler: Kein Client gefunden");
setClientId(null);
setLoading(false);
return;
}

console.log("Client-ID gefunden:", data.ClientID);

setClientId(data.ClientID);
setLoading(false);
};

// 1) E-Mail aus localStorage holen
useEffect(() => {
const email = localStorage.getItem("client_email");

if (!email) {
// nicht eingeloggt → zurück zum Login
router.replace("/login");
return;
}

setClientEmail(email);

const loadClient = async () => {
setLoading(true);

const { data, error } = await supabase
.from("Klienten")
.select("ClientID")
.eq("Email", email)
.single();

if (error || !data) {
console.error("Client für Chat nicht gefunden:", error?.message);
setClientId(null);
} else {
setClientId(data.ClientID);
}

setLoading(false);
};

loadClient();
}, [router]);

// 2) UI
return (
<div
style={{
minHeight: "100vh",
background: "radial-gradient(circle at top left,#050505,#000000)",
color: "white",
padding: "24px 12px",
}}
>
<div
style={{
maxWidth: "900px",
margin: "0 auto",
background: "rgba(0,0,0,0.95)",
borderRadius: "16px",
padding: "20px",
border: "1px solid rgba(250,204,21,0.35)",
boxShadow: "0 25px 60px rgba(0,0,0,0.9)",
}}
>
{/* HEADER */}
<header
style={{
display: "flex",
justifyContent: "space-between",
alignItems: "center",
marginBottom: "16px",
gap: "12px",
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
EliteShred
</div>
<h1 style={{ fontSize: "24px", fontWeight: 700 }}>
Chat mit deinem Coach
</h1>
<p style={{ fontSize: "13px", color: "#9ca3af", marginTop: "4px" }}>
Stelle Fragen, gib Updates und halte deinen Coach am Laufenden.
</p>
</div>

<button
type="button"
onClick={() => router.push("/dashboard")}
style={{
padding: "8px 14px",
borderRadius: "999px",
border: "1px solid #facc15",
background: "transparent",
color: "#facc15",
fontSize: "12px",
cursor: "pointer",
}}
>
Zurück zum Dashboard
</button>
</header>

{/* CONTENT */}
{loading && (
<p style={{ fontSize: "14px" }}>Lade Chat…</p>
)}

{!loading && clientId === null && (
<p style={{ fontSize: "14px", color: "#fca5a5" }}>
Kein Klient für diese E-Mail gefunden. Bitte neu einloggen.
</p>
)}

{!loading && clientId !== null && (
<ClientChatWindow clientId={clientId}
 clientEmail={clientEmail}
 onClose={() => router.push("/dashboard")}
/>
)}
</div>
</div>
);
}