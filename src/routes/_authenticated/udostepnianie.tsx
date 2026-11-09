import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createShareLink, getShareLink, revokeShareLink } from "@/lib/share.functions";

export const Route = createFileRoute("/_authenticated/udostepnianie")({
  component: SharePage,
  head: () => ({
    meta: [
      { title: "Dostęp dla ChatGPT — Forma" },
      {
        name: "description",
        content:
          "Wygeneruj sekretny link tylko do odczytu z pełnym raportem zdrowia, diety i badań dla ChatGPT.",
      },
      { property: "og:title", content: "Dostęp dla ChatGPT — Forma" },
      {
        property: "og:description",
        content: "Sekretny link tylko do odczytu z pełnym raportem zdrowia i badań.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function SharePage() {
  const qc = useQueryClient();
  const fetchLink = useServerFn(getShareLink);
  const create = useServerFn(createShareLink);
  const revoke = useServerFn(revokeShareLink);
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));

  const { data: link, isLoading } = useQuery({
    queryKey: ["share_link"],
    queryFn: () => fetchLink(),
  });

  const reportBaseUrl = link?.token ? `${origin}/raport/${link.token}` : "";
  const url = reportBaseUrl ? `${reportBaseUrl}/dane.json` : "";
  const htmlUrl = reportBaseUrl;
  const txtUrl = reportBaseUrl ? `${reportBaseUrl}/raport.txt` : "";
  const photosUrl = reportBaseUrl ? `${reportBaseUrl}/zdjecia.json` : "";
  const manifestUrl = reportBaseUrl ? `${reportBaseUrl}/manifest.json` : "";


  const gen = useMutation({
    mutationFn: () => create(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["share_link"] });
      toast.success("Nowy link gotowy — stary przestał działać.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const off = useMutation({
    mutationFn: () => revoke(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["share_link"] });
      toast.success("Link unieważniony.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    toast.success("Skopiowano link.");
  };

  return (
    <AppShell>
      <PageHeader
        title="Dostęp dla ChatGPT"
        subtitle="Sekretny link tylko do odczytu z wszystkimi danymi, badaniami i zdjęciami."
      />

      <div className="space-y-4 rounded-xl border border-border/60 bg-card p-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Ładowanie…</p>
        ) : link ? (
          <>
            <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
            <div className="flex flex-wrap gap-2">
               <Button onClick={copy}>Kopiuj link JSON</Button>
              <Button variant="secondary" asChild>
                <a href={url} target="_blank" rel="noreferrer">
                   Otwórz JSON
                </a>
              </Button>
              <Button variant="outline" onClick={() => gen.mutate()} disabled={gen.isPending}>
                Wygeneruj nowy
              </Button>
              <Button variant="ghost" onClick={() => off.mutate()} disabled={off.isPending}>
                Unieważnij
              </Button>
            </div>
             <p className="text-xs text-muted-foreground">
               Ten sam link pokazuje zawsze aktualne dane. Nowy adres jest potrzebny tylko po
               wybraniu „Wygeneruj nowy” lub „Unieważnij”.
             </p>
             <p className="text-xs text-muted-foreground">
               Wersja czytelna w przeglądarce:{" "}
               <a className="underline" href={htmlUrl} target="_blank" rel="noreferrer">
                 {htmlUrl}
               </a>
             </p>
             <p className="text-xs text-muted-foreground">
               Wersja czysto tekstowa:{" "}
              <a className="underline" href={txtUrl} target="_blank" rel="noreferrer">
                {txtUrl}
              </a>
            </p>
            <p className="text-xs text-muted-foreground">
              Same zdjęcia postępów (bezpośrednie linki do plików):{" "}
              <a className="underline" href={photosUrl} target="_blank" rel="noreferrer">
                {photosUrl}
              </a>
            </p>
            <p className="text-xs text-muted-foreground">
              Manifest zdjęć dla AI (photo_id, data, ujęcie, gotowy link .jpg):{" "}
              <a className="underline" href={manifestUrl} target="_blank" rel="noreferrer">
                {manifestUrl}
              </a>
            </p>
            <p className="text-xs text-muted-foreground">
              Główny link zwraca teraz lekki spis z odnośnikami do mniejszych części (dieta,
              jedzenie, treningi, pomiary, notatki, badania, zdjęcia) — dzięki temu odczyt nie
              przekracza limitów czasu. Pełne dane naraz:{" "}
              <a className="underline" href={`${url}?full=1`} target="_blank" rel="noreferrer">
                {url}?full=1
              </a>
            </p>

          </>

        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Nie masz jeszcze aktywnego linku.
            </p>
            <Button onClick={() => gen.mutate()} disabled={gen.isPending}>
              Wygeneruj link
            </Button>
          </>
        )}
      </div>

      <div className="mt-5 space-y-2 rounded-xl border border-border/60 bg-card p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Jak używać</p>
        <p>
           1. Skopiuj link JSON i dodaj go w ChatGPT do źródeł rozmowy (lub poproś „przeczytaj
           ten adres”). To adres bezpośredni, bez przekierowania.
        </p>
        <p>
          2. Strona zawiera plany diety, wpisy Fitatu, treningi, pomiary, notatki, pełne opisy
          badań oraz linki do plików PDF i zdjęć sylwetki.
        </p>
         <p>
           3. Dane są zawsze aktualne — gdy dodasz nowe informacje, poproś ChatGPT o ponowne
           odczytanie tego samego źródła.
         </p>
        <p>
          Link działa bez logowania, więc trzymaj go prywatnie. „Wygeneruj nowy” natychmiast
          unieważnia poprzedni.
        </p>
      </div>
    </AppShell>
  );
}
