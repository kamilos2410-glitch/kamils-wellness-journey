import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/raport/$token/plik/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { resolveShareToken, serveShareFile } = await import("@/lib/share-report.server");
        const link = await resolveShareToken(params.token);
        if (!link) return new Response("Not found", { status: 404 });

        const splat = decodeURIComponent(params._splat ?? "");
        const slash = splat.indexOf("/");
        if (slash < 1) return new Response("Not found", { status: 404 });
        const bucket = splat.slice(0, slash);
        const path = splat.slice(slash + 1);
        return serveShareFile(link.user_id, bucket, path);
      },
    },
  },
});
