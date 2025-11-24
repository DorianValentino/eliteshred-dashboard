// lib/chatMessages.ts

import { supabase } from "@/lib/supabase";

export type ChatMessage = {
id: number;
client_id: number;
sender: "coach" | "client";
receiver_email: string | null;
message: string;
timestamp: string | null;
created_at: string | null;
is_read: boolean | null;
};

// ===== ALLE NACHRICHTEN LADEN =====
export async function loadMessagesForClient(clientId: number) {
const { data, error } = await supabase
.from("messages")
.select("*")
.eq("client_id", clientId)
.order("created_at", { ascending: true });

if (error) {
console.error("loadMessagesForClient ERROR:", error.message);
return [];
}

return data as ChatMessage[];
}

// ===== NACHRICHT SPEICHERN =====
export async function saveMessageForClient(
clientId: number,
sender: "coach" | "client",
message: string,
receiverEmail?: string | null
) {
const { error } = await supabase.from("messages").insert({
client_id: clientId,
sender,
receiver_email: receiverEmail ?? null,
message,
is_read: sender === "client" ? true : false, // Coach → Client = unread
});

if (error) {
console.error("saveMessageForClient ERROR:", error.message);
return false;
}
return true;
}

// ===== UNGELESENE (Client-Dashboard Badge) =====
export async function getUnreadCountForClient(clientId: number) {
const { count, error } = await supabase
.from("messages")
.select("*", { count: "exact", head: true })
.eq("client_id", clientId)
.eq("sender", "coach")
.eq("is_read", false);

if (error) {
console.error("getUnreadCountForClient ERROR:", error.message);
return 0;
}

return count ?? 0;
}

// ===== Coach öffnet Chat → Client Messages werden gelesen =====
export async function markMessagesFromClientAsRead(clientId: number) {
await supabase
.from("messages")
.update({ is_read: true })
.eq("client_id", clientId)
.eq("sender", "client")
.eq("is_read", false);
}

// ===== Client öffnet Chat → Coach Messages werden gelesen =====
export async function markMessagesFromCoachAsRead(clientId: number) {
await supabase
.from("messages")
.update({ is_read: true })
.eq("client_id", clientId)
.eq("sender", "coach")
.eq("is_read", false);
}