import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_progress_photos",
  title: "Zdjęcia postępów",
  description:
    "Zwraca zdjęcia sylwetki z datami i podpisami wraz z tymczasowymi (1 h) linkami do pobrania, które można otworzyć i przeanalizować wizualnie.",
  inputSchema: {
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Data od (YYYY-MM-DD)."),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Data do (YYYY-MM-DD)."),
    limit: z.number().int().min(1).max(50).default(12).describe("Maksymalna liczba zdjęć."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("progress_photos")
      .select("id,photo_date,angle,caption,storage_path")
      .order("photo_date", { ascending: false })
      .limit(limit);
    if (from) query = query.gte("photo_date", from);
    if (to) query = query.lte("photo_date", to);

    const { data, error } = await query;
    if (error) return errorResult(error.message);

    const rows = data ?? [];
    const signed = await Promise.all(
      rows.map(async (row) => {
        const { data: url } = await supabase.storage
          .from("progress-photos")
          .createSignedUrl(row.storage_path, 3600);
        return {
          id: row.id,
          photo_date: row.photo_date,
          angle: row.angle,
          caption: row.caption,
          image_url: url?.signedUrl ?? null,
        };
      }),
    );

    return jsonResult({ count: signed.length, photos: signed, url_expires_in_seconds: 3600 });
  },
});
