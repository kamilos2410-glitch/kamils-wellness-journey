import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-allow-headers": "*",
};

export const Route = createFileRoute("/raport/$token/raport.txt")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ params }) => {
        const { resolveShareToken, renderShareReportText } = await import(
          "@/lib/share-report.server"
        );
        const link = await resolveShareToken(params.token);
        if (!link)
          return new Response("Link nieaktywny lub nieprawidłowy.", { status: 404, headers: cors });

        const text = await renderShareReportText(link.user_id);
        return new Response(text, {
          headers: {
            ...cors,
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=60, s-maxage=60",
          },
        });
      },
    },
  },
});
