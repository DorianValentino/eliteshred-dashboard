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
// =========================================================================

const ChatBubble: React.FC<{ msg: ChatMessage; clientId: number; isMobile: boolean }> = ({ msg, clientId, isMobile }) => {
const isClient = msg.sender === "client";

const dateString = (msg.created_at || msg.timestamp || new Date().toISOString()) as string;
const time = new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

return (
<div
style={{
marginBottom: "12px",
display: 'flex',
justifyContent: isClient ? "flex-end" : "flex-start",
width: '100%',
}}
>
<div
style={{
padding: "10px 14px",
maxWidth: "80%",
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
display: 'block',
minWidth: 0,
width: 'fit-content' as 'fit-content',
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

// FIX: Konstante für den horizontalen Rand
const HORIZONTAL_PADDING = 20;

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

// 🔥 Scroll-Lock für den Body (Behält Scroll-Position des Dashboards)
useEffect(() => {
if (typeof window !== 'undefined' && isMobile) {
const scrollY = window.scrollY;
document.body.style.top = `-${scrollY}px`;

document.body.style.overflow = 'hidden';
document.body.style.position = 'fixed';
document.body.style.width = '100%';
}

return () => {
if (typeof window !== 'undefined' && isMobile) {
const scrollY = document.body.style.top;

document.body.style.overflow = '';
document.body.style.position = '';
document.body.style.width = '';
document.body.style.top = '';

window.scrollTo(0, parseInt(scrollY || '0') * -1);
}
};
}, [isMobile]);


const scrollToBottom = () => {
setTimeout(() => {
if (bottomRef.current) {
bottomRef.current.scrollIntoView({ behavior: "smooth" });
}
}, 100);
};

// 🔥 Nachrichten laden + Realtime Hooks (unverändert)
useEffect(() => {
const load = async () => {
setLoading(true);
const msgs = await loadMessagesForClient(clientId);
setMessages(msgs);
setLoading(false);
await markMessagesFromCoachAsRead(clientId);
if (onMessagesRead) { onMessagesRead(); }
scrollToBottom();
};
load();
}, [clientId, onMessagesRead]);

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
if (onMessagesRead) { onMessagesRead(); }
}
}
)
.subscribe();
return () => { supabase.removeChannel(channel); };
}, [clientId, onMessagesRead]);

// 🔥 Nachricht senden (unverändert)
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

const getMessageDateString = (msg: ChatMessage) =>
(msg.created_at || msg.timestamp || new Date().toISOString()).split('T')[0];


return (
<div
style={{
position: "fixed",
top: 0,
right: 0,
width: isMobile ? "100%" : "420px",
// FIX: Höhe auf 100% (der Parent-Elemente/Viewport) setzen, um mobile vh-Probleme zu umgehen
height: "100%",
background: "#000",
borderLeft: isMobile ? "none" : "2px solid #facc15",
// Horizontaler Rand wird auf das Haupt-Div angewendet
padding: isMobile ? `0 ${HORIZONTAL_PADDING}px` : `${HORIZONTAL_PADDING}px`,
display: "flex",
flexDirection: "column",
zIndex: 10003,
overflowY: 'hidden',
}}
>
{/* Kopfzeile (Statisch oben) */}
<div
style={{
display: 'flex',
justifyContent: 'space-between',
alignItems: 'center',
paddingTop: isMobile ? "40px" : "0",
marginBottom: "10px",
paddingBottom: "10px",
background: '#000',
borderBottom: '1px solid rgba(255,255,255,0.1)',
}}
>
<h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>
Chat mit Coach
</h2>

<button
onClick={onClose}
style={{
color: "#facc15",
fontSize: "22px",
background: "none",
border: "none",
padding: "0",
cursor: "pointer",
zIndex: 10,
boxShadow: "none",
lineHeight: "1",
}}
>
✕
</button>
</div>

{/* Nachrichten Container - Füllt den gesamten MITTLEREN Bereich aus und SCROLLT */}
<div
style={{
flex: 1, // Füllt den gesamten vertikalen Raum zwischen Kopf- und Fußzeile aus
overflowY: "auto",
paddingRight: "6px",
// FIX: Padding Bottom entfernt, da Eingabeleiste Teil des Flex-Layouts ist
paddingBottom: '0',
WebkitOverflowScrolling: 'touch',
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

{/* Eingabe und Senden-Button (Statisch unten, als letztes Flex-Element) */}
<div
style={{
// FIX: Entfernt absolute Positionierung, lässt Flexbox die Position bestimmen
position: 'relative',
bottom: 'auto',
left: 'auto',
right: 'auto',

display: "flex",
alignItems: "stretch",
gap: "10px",
paddingTop: '10px',
background: '#000',
height: 'auto',
}}
>
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