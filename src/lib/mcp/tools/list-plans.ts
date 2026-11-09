import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_plans",
  title: "Plany diety i treningu",
  description:
    "Zwraca historię planów dietetycznych (cele makro na dni treningowe i nietreningowe, notatki dietetyczne) oraz planów treningowych z datami rozpoczęcia.",
  inputSchema: {
    only_active: z.boolean().default(false).describe("Tylko aktualnie aktywne plany."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ only_active }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);

    let diet = supabase.from("diet_plans").select("*").order("start_date", { ascending: false });
    let workout = supabase
      .from("workout_plans")
      .select("*")
      .order("start_date", { ascending: false });
    if (only_active) {
      diet = diet.eq("is_active", true);
      workout = workout.eq("is_active", true);
    }

    const [dietRes, workoutRes] = await Promise.all([diet, workout]);
    if (dietRes.error) return errorResult(dietRes.error.message);
    if (workoutRes.error) return errorResult(workoutRes.error.message);

    return jsonResult({
      diet_plans: dietRes.data ?? [],
      workout_plans: workoutRes.data ?? [],
    });
  },
});
