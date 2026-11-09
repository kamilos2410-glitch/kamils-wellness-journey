import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type OAuthResult = {
  client?: { name?: string; redirect_uri?: string } | null;
  scope?: string | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Połącz aplikację – Forma" },
      { name: "description", content: "Zatwierdź dostęp aplikacji zewnętrznej do Twoich danych zdrowotnych." },
      { property: "og:title", content: "Połącz aplikację – Forma" },
      { property: "og:description", content: "Zatwierdź dostęp aplikacji zewnętrznej do Twoich danych zdrowotnych." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    authorization_id: typeof search["authorization_id"] === "string" ? (search["authorization_id"] as string) : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Brak authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({
        to: "/auth",
        search: { next: location.pathname + location.searchStr },
      });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Nie udało się wczytać prośby o dostęp</CardTitle>
          <CardDescription>{String((error as Error)?.message ?? error)}</CardDescription>
        </CardHeader>
      </Card>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "aplikacja zewnętrzna";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error: err } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Serwer autoryzacji nie zwrócił adresu powrotnego.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Połączyć {clientName} z Twoim kontem?</CardTitle>
          <CardDescription>
            {clientName} będzie mogła odczytywać Twoje dane w tej aplikacji jako Ty.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Plany dietetyczne i cele makro</li>
            <li>• Dzienne kalorie z raportów Fitatu</li>
            <li>• Plany i sesje treningowe</li>
            <li>• Pomiary ciała i notatki zdrowotne</li>
            <li>• Zdjęcia postępów (czasowe linki podglądu)</li>
            <li>• Zapis nowych notatek z analizy</li>
          </ul>
          {details?.client?.redirect_uri ? (
            <p className="text-xs text-muted-foreground break-all">
              Powrót do: {details.client.redirect_uri}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
              Zezwól
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={busy}
              onClick={() => decide(false)}
            >
              Anuluj
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Dostęp możesz w każdej chwili cofnąć, a uprawnienia bazy danych nadal obowiązują.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
