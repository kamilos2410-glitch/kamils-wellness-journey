import { supabase } from "@/integrations/supabase/client";

export async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Brak zalogowanego użytkownika");
  return data.user.id;
}

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const plDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
