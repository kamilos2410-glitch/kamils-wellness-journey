import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/AppShell";
import { plDate, todayISO } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Panel dnia – Forma" },
      { name: "description", content: "Cele makro na dziś, waga, aktywny plan treningowy i postępy." },
      { property: "og:title", content: "Panel dnia – Forma" },
      { property: "og:description", content: "Cele makro na dziś, waga, aktywny plan treningowy i postępy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Panel,
});

function Stat({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="rounded-lg bg-secondary/60 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold">
        {value}
        {unit ? <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span> : null}
      </p>
    </div>
  );
}

function Panel() {
  const today = todayISO();

  const { data } = useQuery({
    queryKey: ["dashboard", today],
    queryFn: async () => {
      const [plan, log, workout, weight, photo, session] = await Promise.all([
        supabase
          .from("diet_plans")
          .select("*")
          .eq("is_active", true)
          .order("start_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("food_logs").select("*").eq("log_date", today).maybeSingle(),
        supabase
          .from("workout_plans")
          .select("*")
          .eq("is_active", true)
          .order("start_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("measurements")
          .select("*")
          .eq("metric", "waga")
          .order("measured_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("progress_photos")
          .select("*")
          .order("photo_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("workout_sessions")
          .select("id,title")
          .eq("session_date", today)
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        plan: plan.data,
        log: log.data,
        workout: workout.data,
        weight: weight.data,
        photo: photo.data,
        session: session.data,
      };
    },
  });



  const training = Boolean(data?.session) || (data?.log?.is_training_day ?? false);
  const plan = data?.plan;
  const trainingTarget = plan
    ? { kcal: plan.training_kcal, p: plan.training_protein, f: plan.training_fat, c: plan.training_carbs }
    : null;
  const restTarget = plan
    ? { kcal: plan.rest_kcal, p: plan.rest_protein, f: plan.rest_fat, c: plan.rest_carbs }
    : null;
  const target = training ? trainingTarget : restTarget;
  const alt = training ? restTarget : trainingTarget;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dziś"
        subtitle={`${plDate(today)} · dzień ${training ? "treningowy" : "nietreningowy"}`}
      />




      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Cel makro {plan ? `(${plan.name})` : ""}</CardTitle>
        </CardHeader>
        <CardContent>
          {target ? (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Kalorie" value={target.kcal ?? "–"} unit="kcal" />
                <Stat label="Białko" value={target.p ?? "–"} unit="g" />
                <Stat label="Tłuszcze" value={target.f ?? "–"} unit="g" />
                <Stat label="Węgle" value={target.c ?? "–"} unit="g" />
              </div>
              {alt ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Gdyby to był dzień {training ? "nietreningowy" : "treningowy"}: {alt.kcal ?? "–"} kcal · B{" "}
                  {alt.p ?? "–"} g · T {alt.f ?? "–"} g · W {alt.c ?? "–"} g
                </p>
              ) : null}
              {data?.session ? (
                <p className="text-[11px] text-muted-foreground">
                  Wykryto trening: {data.session.title ?? "bez nazwy"}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Brak aktywnego planu.{" "}
              <Link to="/dieta" className="text-primary underline">
                Dodaj plan dietetyczny
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Zjedzone dziś</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.log ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Kalorie" value={data.log.kcal ?? "–"} unit="kcal" />
              <Stat label="Białko" value={data.log.protein ?? "–"} unit="g" />
              <Stat label="Tłuszcze" value={data.log.fat ?? "–"} unit="g" />
              <Stat label="Węgle" value={data.log.carbs ?? "–"} unit="g" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Brak wpisu.{" "}
              <Link to="/jedzenie" className="text-primary underline">
                Wklej raport z Fitatu
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ostatnia waga</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.weight ? (
              <p className="text-2xl font-semibold">
                {data.weight.value}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  {data.weight.unit} · {plDate(data.weight.measured_at)}
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                <Link to="/pomiary" className="text-primary underline">
                  Dodaj pomiar
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Aktywny plan treningowy</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.workout ? (
              <div>
                <p className="font-medium">{data.workout.title}</p>
                <p className="text-xs text-muted-foreground">
                  od {plDate(data.workout.start_date)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                <Link to="/treningi" className="text-primary underline">
                  Dodaj plan treningowy
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
