"use client";

import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
ChatMessage,
loadMessagesForClient,
markMessagesFromCoachAsRead,
} from "@/lib/chatMessages";

// =========================================================================
// HILFSKOMPONENTE: CHAT BUBBLE
// (unverändert)
// =========================================================================

const ChatBubble: React.FC<{ msg: ChatMessage; clientId: number; isMobile: boolean }> = ({ msg, clientId, isMobile }) => {
const isClient = msg.sender === "client";

const dateString = (msg.created_at || msg.timestamp || new Date().toISOString()) as string;
const time = new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

return (
<div
style={{
marginBottom: "12px",
textAlign: isClient ? "right" : "left",
}}
>
<div
style={{
display: "inline-block",
padding: "10px 14px",
maxWidth: isMobile ? "85%" : "75%",
borderRadius: "18px",
borderTopLeftRadius: isClient ? "18px" : "4px",
borderTopRightRadius: isClient ? "4px" : "18px",

background: isClient
? "linear-gradient(90deg, #facc15 0%, #eab308 100%)"
: "rgba(255,255,255,0.07)",
color: isClient ? "#000" : "#fff",
fontWeight: 500,
boxShadow: isClient ? "0 4px 8px rgba(250, 204, 21, 0.3)" : "none",

wordWrap: "break-word" as 'break-word',
}}
>
<p style={{
margin: 0,
fontSize: "15px",
whiteSpace: "pre-wrap",
wordBreak: 'break-word',
}}>
{msg.message}
</p>
<span
style={{
fontSize: "10px",
color: isClient ? "rgba(0,0,0,0.6)" : "#9ca3af",
marginTop: "4px",
display: "block",
textAlign: "right",
fontWeight: 400
}}
>
{time}
</span>
</div>
</div>
);
};


// =========================================================================
// HILFSFUNKTION: DATUMSFORMATIERUNG
// (unverändert)
// =========================================================================
const formatDateForDivider = (date: Date): string => {
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);

const isSameDay = (d1: Date, d2: Date) => d1.toDateString() === d2.toDateString();

if (isSameDay(date, today)) {
return "Heute";
}
if (isSameDay(date, yesterday)) {
return "Gestern";
}
return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};


// =========================================================================
// HAUPTKOMPONENTE: CLIENT CHAT WINDOW
// =========================================================================

type ClientChatWindowProps = {
clientId: number;
clientEmail: string;
onClose: () => void;
onMessagesRead?: () => void;
};

export default function ClientChatWindow({
clientId,
clientEmail,
onClose,
onMessagesRead,
}: ClientChatWindowProps) {
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [newMessage, setNewMessage] = useState("");
const [loading, setLoading] = useState(false);
const [sending, setSending] = useState(false);
const [isMobile, setIsMobile] = useState(false);

const bottomRef = useRef<HTMLDivElement | null>(null);

// Hook zur Erkennung der Bildschirmgröße für Responsivität
useEffect(() => {
const checkMobile = () => {
setIsMobile(window.innerWidth < 768);
};
checkMobile();
window.addEventListener('resize', checkMobile);
return () => window.removeEventListener('resize', checkMobile);
}, []);

const scrollToBottom = () => {
setTimeout(() => {
if (bottomRef.current) {
bottomRef.current.scrollIntoView({ behavior: "smooth" });
}
}, 100);
};

// 🔥 Nachrichten laden + alle Coach-Nachrichten als gelesen markieren
useEffect(() => {
const load = async () => {
setLoading(true);
const msgs = await loadMessagesForClient(clientId);
setMessages(msgs);
setLoading(false);

await markMessagesFromCoachAsRead(clientId);

if (onMessagesRead) {
onMessagesRead();
}

scrollToBottom();
};

load();
}, [clientId, onMessagesRead]);

// 🔥 Realtime: neue Nachrichten (INSERT) für diesen Client
useEffect(() => {
const channel = supabase
.channel(`client-chat-${clientId}`)
.on(
"postgres_changes",
{
event: "INSERT",
schema: "public",
table: "messages",
filter: `client_id=eq.${clientId}`,
},
async (payload) => {
const msg = payload.new as ChatMessage;

if (msg.sender === "coach") {
setMessages((prev) => [...prev, msg]);
scrollToBottom();

await supabase
.from("messages")
.update({ is_read: true })
.eq("id", msg.id);

if (onMessagesRead) {
onMessagesRead();
}
}
}
)
.subscribe();

return () => {
supabase.removeChannel(channel);
};
}, [clientId, onMessagesRead]);

// 🔥 Nachricht senden (Client → Coach)
const sendMessage = async () => {
if (!newMessage.trim() || sending) return;

setSending(true);

const messageToSend = newMessage.trim();
const tempMsg: ChatMessage = {
id: Date.now(),
client_id: clientId,
sender: "client",
receiver_email: null,
message: messageToSend,
timestamp: new Date().toISOString(),
created_at: new Date().toISOString(),
is_read: false,
};
setMessages((prev) => [...prev, tempMsg]);
setNewMessage("");
scrollToBottom();

const { error } = await supabase.from("messages").insert({
client_id: clientId,
sender: "client",
receiver_email: null,
message: messageToSend,
is_read: false,
});

if (error) {
console.error("Fehler beim Senden der Nachricht (Client):", error.message);
setMessages((prev) => prev.filter(msg => msg.id !== tempMsg.id));
alert("Fehler beim Senden der Nachricht.");
}

setSending(false);
};

// Hilfsfunktion zum Abrufen des Datumsstrings für die Nachricht
const getMessageDateString = (msg: ChatMessage) =>
(msg.created_at || msg.timestamp || new Date().toISOString()).split('T')[0];


return (
<div
style={{
position: "fixed",
top: 0,
right: 0,
width: isMobile ? "100%" : "420px",
height: "100vh",
background: "rgba(0,0,0,0.97)",
// borderLeft: isMobile ? "none" : "2px solid #facc15", // BorderLeft nur für Desktop
padding: "20px",
display: "flex",
flexDirection: "column",
zIndex: 10002,
// NEU: Keine goldene Linie oben auf Mobile
borderTop: isMobile ? "none" : "2px solid #facc15",
}}
>
{/* NEU: Flexbox-Container für Kopfzeile */}
<div
style={{
display: 'flex',
justifyContent: 'space-between',
alignItems: 'center',
marginBottom: "10px", // Etwas Abstand nach unten
paddingBottom: "10px", // Innerer Abstand
borderBottom: isMobile ? "1px solid rgba(255,255,255,0.1)" : "none", // Dezente Trennlinie auf Mobile
}}
>
<h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>
Chat mit Coach
</h2>

{/* "✕" Button mit Kreis (JETZT IM FLEXBOX-CONTAINER) */}
<button
onClick={onClose}
style={{
// position: "absolute", // Nicht mehr absolut positioniert
// top: "15px", // Diese sind nicht mehr nötig
// right: "15px", // da es im Flexbox ist.

display: 'flex',
alignItems: 'center',
justifyContent: 'center',
width: '30px',
height: '30px',
borderRadius: '50%',
fontSize: "16px",
fontWeight: 700,

color: "#facc15",
background: "transparent",
border: "1px solid #facc15",

cursor: "pointer",
zIndex: 10,
boxShadow: "none",
transition: "all 0.2s",
}}
>
✕
</button>
</div>


{/* Nachrichten Container */}
<div
style={{
flex: 1,
overflowY: "auto",
paddingRight: "6px",
marginBottom: "12px",
}}
>
{loading ? (
<p style={{ color: "#aaa" }}>Lade Nachrichten...</p>
) : (
messages.map((msg, i) => {
const messageElements = [];

const currentDate = getMessageDateString(msg);
const prevMsg = messages[i - 1];
const prevDate = prevMsg ? getMessageDateString(prevMsg) : null;

// Nur Datumstrennlinie anzeigen, wenn sich das Datum ändert
if (i === 0 || currentDate !== prevDate) {
const dateToDisplay = new Date(currentDate);

messageElements.push(
<div
key={`date-${msg.id}`}
style={{
display: 'flex',
alignItems: 'center',
margin: '20px 0 20px 0',
color: '#9ca3af',
fontSize: '11px',
textTransform: 'uppercase',
fontWeight: 600,
}}
>
<div style={{ flexGrow: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
<span style={{ margin: '0 10px', whiteSpace: 'nowrap' }}>
{formatDateForDivider(dateToDisplay)}
</span>
<div style={{ flexGrow: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
</div>
);
}

// Nachricht Bubble hinzufügen
messageElements.push(
<ChatBubble
key={msg.id}
msg={msg}
clientId={clientId}
isMobile={isMobile}
/>
);

return messageElements;
})
)}

<div ref={bottomRef} />
</div>

{/* Eingabe und Senden-Button */}
<div style={{ display: "flex", alignItems: "stretch", gap: "10px" }}>
<input
value={newMessage}
onChange={(e) => setNewMessage(e.target.value)}
onKeyDown={(e) => {
if (e.key === 'Enter') sendMessage();
}}
placeholder="Nachricht eingeben..."
style={{
flex: 1,
minWidth: "100px",
padding: "12px",
borderRadius: "999px",
border: "1px solid #555",
background: "#111",
color: "white",
fontSize: "15px",
}}
/>

<button
onClick={sendMessage}
disabled={sending || !newMessage.trim()}
style={{
width: "auto",
minWidth: "80px",
padding: "12px 16px",
borderRadius: "999px",
background: "#facc15",
color: "#111",
fontWeight: 700,
cursor: "pointer",
opacity: sending || !newMessage.trim() ? 0.5 : 1,
transition: "opacity 0.2s",
fontSize: "15px",
lineHeight: "1.2",
}}
>
Senden
</button>
</div>
</div>
);
}
