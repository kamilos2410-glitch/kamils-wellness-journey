import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/AppShell";
import { currentUserId, plDate, todayISO } from "@/lib/db";
import { parseFitatuReport } from "@/lib/fitatu";
import { parseFitatuScreenshot } from "@/lib/ai.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/jedzenie")({
  head: () => ({
    meta: [
      { title: "Raporty Fitatu – Forma" },
      { name: "description", content: "Wrzuć zrzut ekranu z Fitatu, a makro zapisze się automatycznie." },
      { property: "og:title", content: "Raporty Fitatu – Forma" },
      { property: "og:description", content: "Wrzuć zrzut ekranu z Fitatu, a makro zapisze się automatycznie." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Jedzenie,
});

type Macros = { kcal: string; protein: string; fat: string; carbs: string };
const emptyMacros: Macros = { kcal: "", protein: "", fat: "", carbs: "" };

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
const str = (v: number | null) => (v === null ? "" : String(v));

async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const max = 1400;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Brak canvas");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function Ring({ label, value, goal, unit }: { label: string; value: number | null; goal: number | null; unit: string }) {
  const pct = value !== null && goal ? Math.min(100, Math.round((value / goal) * 100)) : null;
  return (
    <div className="rounded-lg bg-secondary/60 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold leading-tight">
        {value ?? "–"}
        <span className="text-xs font-normal text-muted-foreground"> {unit}</span>
      </p>
      {goal ? (
        <>
          <p className="text-[11px] text-muted-foreground">cel {goal}</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background">
            <div
              className={`h-full rounded-full ${pct && pct > 105 ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${pct ?? 0}%` }}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function Jedzenie() {
  const qc = useQueryClient();
  const parseShot = useServerFn(parseFitatuScreenshot);
  const fileRef = useRef<HTMLInputElement>(null);

  const [date, setDate] = useState(todayISO());
  const [trainingOverride, setTrainingOverride] = useState<boolean | null>(null);
  const [macros, setMacros] = useState<Macros>(emptyMacros);
  const [meals, setMeals] = useState<{ name: string; kcal: number | null }[]>([]);
  const [raw, setRaw] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: plans } = useQuery({
    queryKey: ["diet_plans_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diet_plans")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: trainingDates } = useQuery({
    queryKey: ["training_dates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("session_date")
        .order("session_date", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return new Set((data ?? []).map((s) => s.session_date));
    },
  });

  const planFor = (d: string) =>
    (plans ?? []).find((p) => p.start_date <= d) ?? (plans ?? [])[(plans?.length ?? 1) - 1] ?? null;

  const goalsFor = (d: string, isTraining: boolean) => {
    const p = planFor(d);
    return {
      kcal: isTraining ? p?.training_kcal ?? null : p?.rest_kcal ?? null,
      protein: isTraining ? p?.training_protein ?? null : p?.rest_protein ?? null,
      fat: isTraining ? p?.training_fat ?? null : p?.rest_fat ?? null,
      carbs: isTraining ? p?.training_carbs ?? null : p?.rest_carbs ?? null,
    };
  };

  const autoTraining = trainingDates?.has(date) ?? false;
  const training = trainingOverride ?? autoTraining;
  const plan = planFor(date);
  const goals = goalsFor(date, training);

  const { data: logs } = useQuery({
    queryKey: ["food_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_logs")
        .select("*")
        .order("log_date", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data;
    },
  });


  const scan = useMutation({
    mutationFn: async (file: File) => {
      const imageDataUrl = await compressImage(file);
      return await parseShot({ data: { imageDataUrl } });
    },
    onSuccess: (r) => {
      setMacros({ kcal: str(r.kcal), protein: str(r.protein), fat: str(r.fat), carbs: str(r.carbs) });
      setMeals(r.meals.map((m) => ({ name: m.name, kcal: m.kcal })));
      if (r.date) setDate(r.date);
      const summary = [
        `Zrzut ekranu Fitatu`,
        r.goal_kcal ? `Cel z Fitatu: ${r.goal_kcal} kcal · B ${r.goal_protein ?? "–"} · T ${r.goal_fat ?? "–"} · W ${r.goal_carbs ?? "–"}` : "",
        ...r.meals.map(
          (m) => `${m.name}: ${m.kcal ?? "–"} kcal · B ${m.protein ?? "–"} · T ${m.fat ?? "–"} · W ${m.carbs ?? "–"}`,
        ),
      ]
        .filter(Boolean)
        .join("\n");
      setRaw(summary);
      toast.success("Odczytano zrzut ekranu");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Nie udało się odczytać zrzutu"),
  });

  const save = useMutation({
    mutationFn: async () => {
      const user_id = await currentUserId();
      const { error } = await supabase.from("food_logs").upsert(
        {
          user_id,
          log_date: date,
          is_training_day: training,
          kcal: numOrNull(macros.kcal),
          protein: numOrNull(macros.protein),
          fat: numOrNull(macros.fat),
          carbs: numOrNull(macros.carbs),
          raw_report: raw.trim().slice(0, 20000) || null,
        },
        { onConflict: "user_id,log_date" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dzień zapisany");
      setRaw("");
      setMacros(emptyMacros);
      setMeals([]);
      setTrainingOverride(null);
      qc.invalidateQueries();
    },

    onError: (e) => toast.error(e instanceof Error ? e.message : "Błąd zapisu"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("food_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const field = (key: keyof Macros, label: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type="number"
        inputMode="decimal"
        value={macros[key]}
        onChange={(e) => setMacros({ ...macros, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Fitatu" subtitle="Wrzuć zrzut ekranu – makro odczytam automatycznie" />

      <Card>
        <CardContent className="space-y-4 pt-5">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) scan.mutate(f);
              e.target.value = "";
            }}
          />
          <Button className="w-full" onClick={() => fileRef.current?.click()} disabled={scan.isPending}>
            {scan.isPending ? "Odczytuję zrzut ekranu…" : "Wgraj zrzut ekranu z Fitatu"}
          </Button>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex flex-col justify-end gap-1 pb-1">
              <div className="flex items-center gap-2">
                <Switch
                  id="training"
                  checked={training}
                  onCheckedChange={(v) => setTrainingOverride(v === autoTraining ? null : v)}
                />
                <Label htmlFor="training">Dzień treningowy</Label>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {autoTraining
                  ? "Wykryto trening w tym dniu – cele z dnia treningowego"
                  : "Brak treningu w tym dniu – cele z dnia nietreningowego"}
                {plan ? ` · plan: ${plan.name}` : ""}
              </p>
            </div>
          </div>


          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Ring label="Kcal" value={numOrNull(macros.kcal)} goal={goals.kcal} unit="kcal" />
            <Ring label="Białko" value={numOrNull(macros.protein)} goal={goals.protein} unit="g" />
            <Ring label="Tłuszcz" value={numOrNull(macros.fat)} goal={goals.fat} unit="g" />
            <Ring label="Węgle" value={numOrNull(macros.carbs)} goal={goals.carbs} unit="g" />
          </div>

          {meals.length ? (
            <div className="space-y-1 rounded-lg bg-secondary/40 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Posiłki</p>
              {meals.map((m, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{m.name}</span>
                  <span className="text-muted-foreground">{m.kcal ?? "–"} kcal</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {field("kcal", "Kcal")}
            {field("protein", "Białko (g)")}
            {field("fat", "Tłuszcz (g)")}
            {field("carbs", "Węgle (g)")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="raw">Raport / notatka (opcjonalnie)</Label>
            <Textarea
              id="raw"
              rows={5}
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value);
              }}
              onBlur={() => {
                if (!macros.kcal && raw.trim()) {
                  const p = parseFitatuReport(raw);
                  setMacros({ kcal: str(p.kcal), protein: str(p.protein), fat: str(p.fat), carbs: str(p.carbs) });
                }
              }}
              placeholder={"Możesz też wkleić raport tekstowy z Fitatu"}
            />
          </div>

          <Button onClick={() => save.mutate()} disabled={save.isPending || !macros.kcal}>
            Zapisz dzień
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Historia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs?.length ? (
            logs.map((l) => {
              const isT = trainingDates?.has(l.log_date) ?? l.is_training_day;
              const g = goalsFor(l.log_date, isT);
              return (
              <div key={l.id} className="rounded-md bg-secondary/40 px-3 py-2 text-sm">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 text-left"
                  onClick={() => setOpenId(openId === l.id ? null : l.id)}
                >
                  <span className="font-medium">
                    {plDate(l.log_date)} {isT ? "🏋️" : ""}
                  </span>
                  <span className="text-muted-foreground">
                    {l.kcal ?? "–"}
                    {g.kcal ? ` / ${g.kcal}` : ""} kcal
                  </span>
                </button>
                {openId === l.id ? (
                  <div className="mt-2 space-y-2 border-t border-border pt-2">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Ring label="Kcal" value={l.kcal} goal={g.kcal} unit="kcal" />
                      <Ring label="Białko" value={l.protein} goal={g.protein} unit="g" />
                      <Ring label="Tłuszcz" value={l.fat} goal={g.fat} unit="g" />
                      <Ring label="Węgle" value={l.carbs} goal={g.carbs} unit="g" />
                    </div>
                    {l.raw_report ? (
                      <p className="whitespace-pre-wrap text-xs text-muted-foreground">{l.raw_report}</p>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={() => remove.mutate(l.id)}>
                      Usuń
                    </Button>
                  </div>
                ) : null}
              </div>
              );
            })

          ) : (
            <p className="text-sm text-muted-foreground">Brak wpisów.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
