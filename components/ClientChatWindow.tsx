"use client";

import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
ChatMessage,
loadMessagesForClient,
markMessagesFromCoachAsRead,
} from "@/lib/chatMessages";

type ClientChatWindowProps = {
clientId: number;
clientEmail: string;
onClose: () => void;
onMessagesRead?: () => void; // <-- wichtig für das Badge
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

const bottomRef = useRef<HTMLDivElement | null>(null);

const scrollToBottom = () => {
if (bottomRef.current) {
bottomRef.current.scrollIntoView({ behavior: "smooth" });
}
};

// 🔥 Nachrichten laden + alle Coach-Nachrichten als gelesen markieren
useEffect(() => {
const load = async () => {
setLoading(true);
const msgs = await loadMessagesForClient(clientId);
setMessages(msgs);
setLoading(false);

// alles vom Coach als gelesen markieren
await markMessagesFromCoachAsRead(clientId);

// Badge im Dashboard zurücksetzen
if (onMessagesRead) {
onMessagesRead();
}

// nach dem Laden nach unten scrollen
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

// Nur Coach → Client anzeigen
if (msg.sender === "coach") {
setMessages((prev) => [...prev, msg]);
scrollToBottom();

// Direkt als gelesen markieren
await supabase
.from("messages")
.update({ is_read: true })
.eq("id", msg.id);

// Badge resetten
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
if (!newMessage.trim()) return;

setSending(true);

const { error } = await supabase.from("messages").insert({
client_id: clientId,
sender: "client",
receiver_email: null,
message: newMessage,
is_read: false, // für den Coach ist diese Nachricht erstmal ungelesen
});

if (!error) {
const newMsg: ChatMessage = {
id: Date.now(),
client_id: clientId,
sender: "client",
receiver_email: null,
message: newMessage,
timestamp: new Date().toISOString(),
created_at: new Date().toISOString(),
is_read: false,
};

setMessages((prev) => [...prev, newMsg]);
setNewMessage("");
scrollToBottom();
} else {
console.error("Fehler beim Senden der Nachricht (Client):", error.message);
}

setSending(false);
};

return (
<div
style={{
position: "fixed",
top: 0,
right: 0,
width: "420px",
height: "100vh",
background: "rgba(0,0,0,0.97)",
borderLeft: "2px solid #facc15",
padding: "20px",
display: "flex",
flexDirection: "column",
zIndex: 10002,
}}
>
{/* X-Button */}
<button
onClick={onClose}
style={{
position: "absolute",
top: "15px",
right: "15px",
color: "#facc15",
fontSize: "22px",
background: "none",
border: "none",
cursor: "pointer",
}}
>
✕
</button>

<h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "10px" }}>
Chat mit Coach
</h2>

{/* Nachrichten */}
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
messages.map((msg) => (
<div
key={msg.id}
style={{
marginBottom: "12px",
textAlign: msg.sender === "client" ? "right" : "left",
}}
>
<div
style={{
display: "inline-block",
padding: "10px 14px",
borderRadius: "12px",
background:
msg.sender === "client"
? "#facc15"
: "rgba(255,255,255,0.07)",
color: msg.sender === "client" ? "#000" : "#fff",
maxWidth: "80%",
}}
>
{msg.message}
</div>
</div>
))
)}

<div ref={bottomRef} />
</div>

{/* Eingabe */}
<div style={{ display: "flex", gap: "10px" }}>
<input
value={newMessage}
onChange={(e) => setNewMessage(e.target.value)}
placeholder="Nachricht eingeben..."
style={{
flex: 1,
padding: "10px",
borderRadius: "8px",
border: "1px solid #555",
background: "#111",
color: "white",
}}
/>

<button
onClick={sendMessage}
disabled={sending}
style={{
padding: "10px 16px",
borderRadius: "8px",
background: "#facc15",
color: "#111",
fontWeight: 700,
cursor: "pointer",
opacity: sending ? 0.5 : 1,
}}
>
Senden
</button>
</div>
</div>
);
}