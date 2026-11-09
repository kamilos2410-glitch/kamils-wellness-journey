import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "get_health_overview",
  title: "Przegląd zdrowia",
  description:
    "Pełny przegląd: aktywny plan dietetyczny (makro na dzień treningowy i nietreningowy), aktywny plan treningowy, ostatnie wpisy kalorii z Fitatu, ostatnie pomiary, notatki i liczba zdjęć postępów.",
  inputSchema: {
    days: z
      .number()
      .int()
      .min(1)
      .max(365)
      .default(30)
      .describe("Ile ostatnich dni uwzględnić w logach jedzenia i pomiarach."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    const [dietPlan, workoutPlan, foodLogs, measurements, notes, sessions, photos] =
      await Promise.all([
        supabase
          .from("diet_plans")
          .select("*")
          .eq("is_active", true)
          .order("start_date", { ascending: false })
          .limit(1),
        supabase
          .from("workout_plans")
          .select("*")
          .eq("is_active", true)
          .order("start_date", { ascending: false })
          .limit(1),
        supabase
          .from("food_logs")
          .select("log_date,is_training_day,kcal,protein,fat,carbs")
          .gte("log_date", since)
          .order("log_date", { ascending: false }),
        supabase
          .from("measurements")
          .select("measured_at,metric,value,unit")
          .gte("measured_at", since)
          .order("measured_at", { ascending: false }),
        supabase
          .from("notes")
          .select("note_date,title,content")
          .order("note_date", { ascending: false })
          .limit(20),
        supabase
          .from("workout_sessions")
          .select("session_date,notes")
          .gte("session_date", since)
          .order("session_date", { ascending: false }),
        supabase.from("progress_photos").select("photo_date", { count: "exact", head: true }),
      ]);

    const { data: exams } = await supabase
      .from("medical_exams")
      .select("exam_date,title,category,description")
      .order("exam_date", { ascending: false })
      .limit(10);

    const firstError = [dietPlan, workoutPlan, foodLogs, measurements, notes, sessions].find(
      (r) => r.error,
    )?.error;
    if (firstError) return errorResult(firstError.message);

    const logs = foodLogs.data ?? [];
    const avg = (key: "kcal" | "protein" | "fat" | "carbs") => {
      const vals = logs.map((l) => l[key]).filter((v): v is number => typeof v === "number");
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    };

    return jsonResult({
      range_days: days,
      active_diet_plan: dietPlan.data?.[0] ?? null,
      active_workout_plan: workoutPlan.data?.[0] ?? null,
      food_logs: logs,
      food_averages: {
        kcal: avg("kcal"),
        protein: avg("protein"),
        fat: avg("fat"),
        carbs: avg("carbs"),
        days_logged: logs.length,
      },
      measurements: measurements.data ?? [],
      workout_sessions: sessions.data ?? [],
      notes: notes.data ?? [],
      progress_photo_count: photos.count ?? 0,
      recent_medical_exams: exams ?? [],
    });
  },
});
