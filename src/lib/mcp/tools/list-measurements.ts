import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_measurements",
  title: "Pomiary ciała",
  description:
    "Pomiary (waga, obwody, inne metryki) w wybranym zakresie dat, posortowane od najnowszych.",
  inputSchema: {
    metric: z.string().optional().describe("Filtr metryki, np. 'waga'."),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Data od (YYYY-MM-DD)."),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Data do (YYYY-MM-DD)."),
    limit: z.number().int().min(1).max(500).default(200).describe("Maksymalna liczba wpisów."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ metric, from, to, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("measurements")
      .select("measured_at,metric,value,unit,note")
      .order("measured_at", { ascending: false })
      .limit(limit);
    if (metric) query = query.eq("metric", metric);
    if (from) query = query.gte("measured_at", from);
    if (to) query = query.lte("measured_at", to);

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult({ count: data?.length ?? 0, measurements: data ?? [] });
  },
});
