// components/ChatWindow.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Client } from "@/types/Client";
import { supabase } from "@/lib/supabase";
import {
ChatMessage,
loadMessagesForClient,
saveMessageForClient,
markMessagesFromClientAsRead,
} from "@/lib/chatMessages";

type ChatWindowProps = {
client: Client;
onClose: () => void;
};

export default function ChatWindow({ client, onClose }: ChatWindowProps) {
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

// 🔥 Beim ersten Öffnen: Nachrichten laden + Client-Nachrichten als gelesen markieren
useEffect(() => {
const load = async () => {
setLoading(true);
const msgs = await loadMessagesForClient(client.ClientID);
setMessages(msgs);
setLoading(false);

await markMessagesFromClientAsRead(client.ClientID);
};
load();
}, [client.ClientID]);

// 🔥 Auto-Scroll bei jeder Änderung der Nachrichten
useEffect(() => {
scrollToBottom();
}, [messages]);

// 🔥 Realtime: neue Nachrichten vom CLIENT live empfangen
useEffect(() => {
if (!client.ClientID) return;

const channel = supabase
.channel(`admin-chat-${client.ClientID}`)
.on(
"postgres_changes",
{
event: "INSERT",
schema: "public",
table: "messages",
filter: `client_id=eq.${client.ClientID}`,
},
(payload) => {
const msg: any = payload.new;

// Nur Client → Coach Nachrichten anhängen
if (msg.sender === "client") {
setMessages((prev) => [...prev, msg]);
}
}
)
.subscribe();

return () => {
supabase.removeChannel(channel);
};
}, [client.ClientID]);

// 🔥 Nachricht senden (Coach → Client)
const sendMessage = async () => {
if (!newMessage.trim()) return;

setSending(true);

const success = await saveMessageForClient(
client.ClientID,
"coach",
newMessage,
client.Email ?? null
);

if (success) {
const newMsg: ChatMessage = {
id: Date.now(), // lokale ID für React
client_id: client.ClientID,
sender: "coach",
receiver_email: client.Email ?? null,
message: newMessage,
timestamp: new Date().toISOString(),
created_at: new Date().toISOString(),
// aus Sicht des Coach egal – in der DB ist sie für den Client "ungelesen"
is_read: false,
};

setMessages((prev) => [...prev, newMsg]);
setNewMessage("");
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
Chat mit {client.Name}
</h2>

{/* Nachrichtenbereich */}
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
textAlign: msg.sender === "coach" ? "right" : "left",
}}
>
<div
style={{
display: "inline-block",
padding: "10px 14px",
borderRadius: "12px",
background:
msg.sender === "coach"
? "#facc15"
: "rgba(255,255,255,0.07)",
color: msg.sender === "coach" ? "#000" : "#fff",
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