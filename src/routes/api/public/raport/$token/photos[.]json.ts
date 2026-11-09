import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/raport/$token/photos.json")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { resolveShareToken, renderSharePhotosJson } = await import(
          "@/lib/share-report.server"
        );
        const link = await resolveShareToken(params.token);
        if (!link) {
          return Response.json({ error: "Link nieaktywny lub nieprawidłowy." }, { status: 404 });
        }

        const url = new URL(request.url);
        const report = await renderSharePhotosJson(link.user_id, params.token, url.origin);
        return Response.json(report, {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=300, s-maxage=300",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
