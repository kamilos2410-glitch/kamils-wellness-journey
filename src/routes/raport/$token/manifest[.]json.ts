import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-allow-headers": "*",
};

export const Route = createFileRoute("/raport/$token/manifest.json")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ params, request }) => {
        const { resolveShareToken, renderPhotoManifest } = await import(
          "@/lib/share-report.server"
        );
        const link = await resolveShareToken(params.token);
        if (!link) {
          return Response.json(
            { error: "Link nieaktywny lub nieprawidłowy." },
            { status: 404, headers: cors },
          );
        }
        const url = new URL(request.url);
        const manifest = await renderPhotoManifest(link.user_id, params.token, url.origin);
        return Response.json(manifest, {
          headers: {
            ...cors,
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=60, s-maxage=60",
          },
        });
      },
    },
  },
});
