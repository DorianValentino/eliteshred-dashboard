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

// Umbruch-Einstellungen für lange Wörter
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

return (
<div
style={{
position: "fixed",
top: 0,
right: 0,
width: isMobile ? "100%" : "420px",
height: "100vh",
background: "rgba(0,0,0,0.97)",
borderLeft: isMobile ? "none" : "2px solid #facc15",
padding: "20px",
display: "flex",
flexDirection: "column",
zIndex: 10002,
}}
>
{/* X-Button: NEUE, DEZENTE STYLES */}
<button
onClick={onClose}
style={{
position: "absolute",
top: "15px",
right: "15px",
color: "#facc15",
fontSize: "18px", // Dezenter
background: "none",
border: "none",
padding: "0",
cursor: "pointer",
zIndex: 10,
boxShadow: "none", // Schatten entfernen
lineHeight: "1",
}}
>
✕
</button>

<h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "10px" }}>
Chat mit Coach
</h2>

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
messages.map((msg) => (
<ChatBubble
key={msg.id}
msg={msg}
clientId={clientId}
isMobile={isMobile}
/>
))
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