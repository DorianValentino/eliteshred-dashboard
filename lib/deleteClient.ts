import { supabase } from "./supabase";

export async function deleteClientByEmail(email: string | null) {
    if (!email) {
        throw new Error("Keine E-Mail übergeben - Klient kann nicht gelöscht werden.")
    }

    const { error } = await supabase
      .from("Klienten")
      .delete()
      .eq("Email", email);

    if (error) {
        console.error("Löschfehler:", error);
        throw new Error("Könnte Klient nicht löschen.");
    }

    return true;
}