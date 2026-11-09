import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-allow-headers": "*",
};

export const Route = createFileRoute("/api/public/raport/$token/sekcja/$")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ params, request }) => {
        const { resolveShareToken, renderShareSection, SHARE_SECTIONS, SHARE_JSON_HEADERS } =
          await import("@/lib/share-report.server");

        const link = await resolveShareToken(params.token);
        if (!link) {
          return Response.json(
            { error: "Link nieaktywny lub nieprawidłowy." },
            { status: 404, headers: cors },
          );
        }

        const name = decodeURIComponent(params._splat ?? "").replace(/\.json$/i, "");
        if (!SHARE_SECTIONS[name]) {
          return Response.json(
            { error: "Nieznana sekcja.", available: Object.keys(SHARE_SECTIONS) },
            { status: 404, headers: cors },
          );
        }

        const url = new URL(request.url);
        const num = (key: string) => {
          const raw = url.searchParams.get(key);
          const parsed = raw === null ? NaN : Number(raw);
          return Number.isFinite(parsed) ? parsed : undefined;
        };

        const payload = await renderShareSection(link.user_id, name, params.token, url.origin, {
          limit: num("limit"),
          offset: num("offset"),
        });

        return Response.json(payload, { headers: SHARE_JSON_HEADERS });
      },
    },
  },
});
