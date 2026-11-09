import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const getShareLink = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("share_links")
      .select("id,token,created_at,last_accessed_at")
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw new Error(error.message);
    return data?.[0] ?? null;
  });

export const createShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase
      .from("share_links")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("revoked_at", null);

    const token = randomToken();
    const { data, error } = await context.supabase
      .from("share_links")
      .insert({ user_id: context.userId, token, token_hash: await sha256Hex(token) })
      .select("id,token,created_at,last_accessed_at")
      .single();
    if (error) throw new Error(error.message);
    return data;
  });

export const revokeShareLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("share_links")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .is("revoked_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
