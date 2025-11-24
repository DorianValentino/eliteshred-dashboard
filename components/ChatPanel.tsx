"use client";

import { Client } from "@/types/Client"; // WICHTIG: Der gleiche Typ
import React from "react";

type ChatPanelProps = {
clients: Client[];
onClose: () => void;
onSelectClient: (client: Client) => void; // <-- WICHTIG
};

export default function ChatPanel({ clients, onClose, onSelectClient }: ChatPanelProps) {
return (
<div
style={{
position: "fixed",
top: 0,
right: 0,
width: "350px",
height: "100vh",
background: "rgba(0,0,0,0.95)",
borderLeft: "2px solid #facc15",
padding: "20px",
overflowY: "auto",
zIndex: 10001,
}}
>
<div
style={{
fontSize: "22px",
fontWeight: 700,
marginBottom: "20px",
}}
>
Chat
</div>

<button
onClick={onClose}
style={{
position: "absolute",
top: "15px",
right: "15px",
fontSize: "22px",
cursor: "pointer",
background: "none",
color: "#facc15",
border: "none",
}}
>
✕
</button>

{/* 16 Wochen Programm */}
<h3
style={{
marginTop: "20px",
marginBottom: "10px",
color: "#facc15",
letterSpacing: "0.15em",
fontSize: "13px",
}}
>
16 WOCHEN PROGRAMM
</h3>

{clients
.filter((c) => c.Paket === "16")
.map((client) => (
<div
key={client.ClientID}
onClick={() => onSelectClient(client)}
style={{
padding: "12px",
borderRadius: "10px",
background: "rgba(255,255,255,0.05)",
marginBottom: "10px",
cursor: "pointer",
}}
>
{client.Name}
</div>
))}

{/* 16R */}
<h3
style={{
marginTop: "20px",
marginBottom: "10px",
color: "#facc15",
letterSpacing: "0.15em",
fontSize: "13px",
}}
>
16R PROGRAMM
</h3>

{clients
.filter((c) => c.Paket === "16R")
.map((client) => (
<div
key={client.ClientID}
onClick={() => onSelectClient(client)}
style={{
padding: "12px",
borderRadius: "10px",
background: "rgba(255,255,255,0.05)",
marginBottom: "10px",
cursor: "pointer",
}}
>
{client.Name}
</div>
))}

{/* Monthly */}
<h3
style={{
marginTop: "20px",
marginBottom: "10px",
color: "#facc15",
letterSpacing: "0.15em",
fontSize: "13px",
}}
>
MONTHLY
</h3>

{clients
.filter((c) => c.Paket === "Monthly")
.map((client) => (
<div
key={client.ClientID}
onClick={() => onSelectClient(client)}
style={{
padding: "12px",
borderRadius: "10px",
background: "rgba(255,255,255,0.05)",
marginBottom: "10px",
cursor: "pointer",
}}
>
{client.Name}
</div>
))}
</div>
);
}