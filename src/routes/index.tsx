import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Activity, Apple, Camera, LineChart } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Forma – dziennik zdrowia, diety i treningu" },
      {
        name: "description",
        content:
          "Prywatna aplikacja do zapisywania diety, planów treningowych, pomiarów, zdjęć postępów i notatek zdrowotnych.",
      },
      { property: "og:title", content: "Forma – dziennik zdrowia, diety i treningu" },
      {
        property: "og:description",
        content:
          "Prywatna aplikacja do zapisywania diety, planów treningowych, pomiarów, zdjęć postępów i notatek zdrowotnych.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Apple, title: "Dieta", desc: "Cele makro dla dni treningowych i nietreningowych." },
  { icon: Activity, title: "Treningi", desc: "Plan tekstowy z datą startu i dziennik sesji." },
  { icon: LineChart, title: "Pomiary", desc: "Waga i obwody z wykresem oraz importem z Excela." },
  { icon: Camera, title: "Zdjęcia", desc: "Prywatna galeria postępów, także zdjęcia historyczne." },
];

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/panel", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-5 py-20">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">Twój dziennik formy</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          Wszystko o Twoim zdrowiu w jednym miejscu
        </h1>
        <p className="mt-4 text-muted-foreground">
          Dieta, kalorie z Fitatu, plany treningowe, pomiary, zdjęcia sylwetki i notatki – prywatnie,
          z historią i wykresami.
        </p>
        <Button className="mt-6" size="lg" onClick={() => navigate({ to: "/auth" })}>
          Zaloguj się
        </Button>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-border/60 bg-card p-4">
              <f.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 font-medium">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
