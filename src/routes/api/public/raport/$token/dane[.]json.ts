import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-allow-headers": "*",
};

export const Route = createFileRoute("/api/public/raport/$token/dane.json")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ params, request }) => {
        const { resolveShareToken, renderShareReportJson, renderShareIndex, SHARE_JSON_HEADERS } =
          await import("@/lib/share-report.server");
        const link = await resolveShareToken(params.token);
        if (!link) {
          return Response.json(
            { error: "Link nieaktywny lub nieprawidłowy." },
            { status: 404, headers: cors },
          );
        }

        const url = new URL(request.url);
        const full = url.searchParams.get("full");
        const payload =
          full === "1" || full === "true"
            ? await renderShareReportJson(link.user_id, params.token, url.origin)
            : await renderShareIndex(link.user_id, params.token, url.origin);

        return Response.json(payload, { headers: SHARE_JSON_HEADERS });
      },
    },
  },
});
