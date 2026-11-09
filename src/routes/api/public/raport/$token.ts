import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/raport/$token")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { resolveShareToken, renderShareReport, renderShareReportText } = await import(
          "@/lib/share-report.server"
        );
        const link = await resolveShareToken(params.token);
        if (!link) return new Response("Link nieaktywny lub nieprawidłowy.", { status: 404 });

        const url = new URL(request.url);
        const format = url.searchParams.get("format");

        if (format === "txt" || format === "text") {
          const text = await renderShareReportText(link.user_id);
          return new Response(text, {
            headers: {
              "content-type": "text/plain; charset=utf-8",
              "cache-control": "no-store",
            },
          });
        }

        const html = await renderShareReport(link.user_id, params.token, url.origin);
        return new Response(html, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
