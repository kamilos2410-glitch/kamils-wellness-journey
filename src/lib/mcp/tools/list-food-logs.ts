import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_food_logs",
  title: "Dzienne kalorie (Fitatu)",
  description:
    "Lista dziennych wpisów kalorycznych i makro (z raportów Fitatu) w wybranym zakresie dat, z oznaczeniem dni treningowych.",
  inputSchema: {
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Data od (YYYY-MM-DD)."),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Data do (YYYY-MM-DD)."),
    include_raw: z
      .boolean()
      .default(false)
      .describe("Czy dołączyć oryginalną treść wklejonego raportu."),
    limit: z.number().int().min(1).max(400).default(90).describe("Maksymalna liczba dni."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, include_raw, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("food_logs")
      .select(
        include_raw
          ? "log_date,is_training_day,kcal,protein,fat,carbs,raw_report"
          : "log_date,is_training_day,kcal,protein,fat,carbs",
      )
      .order("log_date", { ascending: false })
      .limit(limit);
    if (from) query = query.gte("log_date", from);
    if (to) query = query.lte("log_date", to);

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult({ count: data?.length ?? 0, logs: data ?? [] });
  },
});
