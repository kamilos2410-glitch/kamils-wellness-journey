import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-allow-headers": "*",
};

async function handle(token: string, splat: string) {
  const { resolveShareToken, servePhotoById } = await import("@/lib/share-report.server");
  const link = await resolveShareToken(token);
  if (!link) return new Response("Not found", { status: 404, headers: cors });
  const id = decodeURIComponent(splat).replace(/\.(jpg|jpeg|png|webp)$/i, "");
  return servePhotoById(link.user_id, id);
}

export const Route = createFileRoute("/api/public/raport/$token/photo/$")({
  server: {
    handlers: {
      GET: async ({ params }) => handle(params.token, params._splat ?? ""),
      HEAD: async ({ params }) => handle(params.token, params._splat ?? ""),
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
    },
  },
});
