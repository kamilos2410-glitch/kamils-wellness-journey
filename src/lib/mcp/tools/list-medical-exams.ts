import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_medical_exams",
  title: "Badania lekarskie",
  description:
    "Zwraca badania lekarskie: datę, kategorię, nazwę i pełny opis wyników wraz z tymczasowymi (1 h) linkami do załączonych plików (PDF, zdjęcia), które można otworzyć i przeanalizować.",
  inputSchema: {
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Data od (YYYY-MM-DD)."),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Data do (YYYY-MM-DD)."),
    limit: z.number().int().min(1).max(100).default(50).describe("Maksymalna liczba badań."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("medical_exams")
      .select("id,exam_date,title,category,description,storage_path,file_name")
      .order("exam_date", { ascending: false })
      .limit(limit);
    if (from) query = query.gte("exam_date", from);
    if (to) query = query.lte("exam_date", to);

    const { data, error } = await query;
    if (error) return errorResult(error.message);

    const rows = data ?? [];
    const { data: attachments } = await supabase
      .from("medical_exam_files")
      .select("exam_id,storage_path,file_name");

    const sign = async (path: string) => {
      const { data: url } = await supabase.storage
        .from("medical-exams")
        .createSignedUrl(path, 3600);
      return url?.signedUrl ?? null;
    };

    const exams = await Promise.all(
      rows.map(async (row) => {
        const own = (attachments ?? []).filter((a) => a.exam_id === row.id);
        const files = await Promise.all([
          ...(row.storage_path
            ? [
                (async () => ({
                  file_name: row.file_name,
                  file_url: await sign(row.storage_path as string),
                }))(),
              ]
            : []),
          ...own.map(async (a) => ({
            file_name: a.file_name,
            file_url: await sign(a.storage_path),
          })),
        ]);
        return {
          id: row.id,
          exam_date: row.exam_date,
          title: row.title,
          category: row.category,
          description: row.description,
          files,
        };
      }),
    );

    return jsonResult({ count: exams.length, exams, url_expires_in_seconds: 3600 });
  },
});
