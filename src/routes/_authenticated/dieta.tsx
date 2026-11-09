import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/AppShell";
import { currentUserId, plDate, todayISO } from "@/lib/db";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dieta")({
  head: () => ({
    meta: [
      { title: "Plany dietetyczne – Forma" },
      { name: "description", content: "Cele makro na dni treningowe i nietreningowe wraz z historią planów." },
      { property: "og:title", content: "Plany dietetyczne – Forma" },
      { property: "og:description", content: "Cele makro na dni treningowe i nietreningowe wraz z historią planów." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dieta,
});

const empty = {
  name: "",
  start_date: todayISO(),
  training_kcal: "",
  training_protein: "",
  training_fat: "",
  training_carbs: "",
  rest_kcal: "",
  rest_protein: "",
  rest_fat: "",
  rest_carbs: "",
  notes: "",
};

const n = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

function Dieta() {
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const [active, setActive] = useState(true);

  const { data: plans } = useQuery({
    queryKey: ["diet_plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diet_plans")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const user_id = await currentUserId();
      if (!form.name.trim()) throw new Error("Podaj nazwę planu");
      if (active) {
        await supabase.from("diet_plans").update({ is_active: false }).eq("is_active", true);
      }
      const { error } = await supabase.from("diet_plans").insert({
        user_id,
        name: form.name.trim().slice(0, 120),
        start_date: form.start_date,
        is_active: active,
        training_kcal: n(form.training_kcal),
        training_protein: n(form.training_protein),
        training_fat: n(form.training_fat),
        training_carbs: n(form.training_carbs),
        rest_kcal: n(form.rest_kcal),
        rest_protein: n(form.rest_protein),
        rest_fat: n(form.rest_fat),
        rest_carbs: n(form.rest_carbs),
        notes: form.notes.trim().slice(0, 4000) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan zapisany");
      setForm({ ...empty });
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Błąd zapisu"),
  });

  const activate = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("diet_plans").update({ is_active: false }).eq("is_active", true);
      const { error } = await supabase.from("diet_plans").update({ is_active: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("diet_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const field = (key: keyof typeof empty, label: string, type = "number") => (
    <div className="space-y-1.5">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Dieta" subtitle="Cele makro dla dni treningowych i nietreningowych" />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Nowy plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {field("name", "Nazwa planu", "text")}
            {field("start_date", "Data rozpoczęcia", "date")}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">
              Dzień treningowy
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {field("training_protein", "Białko (g)")}
              {field("training_fat", "Tłuszcz (g)")}
              {field("training_carbs", "Węgle (g)")}
              {field("training_kcal", "Kcal")}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Dzień nietreningowy
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {field("rest_protein", "Białko (g)")}
              {field("rest_fat", "Tłuszcz (g)")}
              {field("rest_carbs", "Węgle (g)")}
              {field("rest_kcal", "Kcal")}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notatki / rozpiska posiłków</Label>
            <Textarea
              id="notes"
              rows={5}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Wklej tu treść notatki z iPhone'a..."
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch id="active" checked={active} onCheckedChange={setActive} />
            <Label htmlFor="active">Ustaw jako aktywny plan</Label>
          </div>

          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Zapisz plan
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {plans?.map((p) => (
          <Card key={p.id}>
            <CardContent className="space-y-2 pt-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {p.name}{" "}
                    {p.is_active ? (
                      <span className="ml-1 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] uppercase text-primary">
                        aktywny
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">od {plDate(p.start_date)}</p>
                </div>
                <div className="flex gap-2">
                  {!p.is_active && (
                    <Button size="sm" variant="outline" onClick={() => activate.mutate(p.id)}>
                      Aktywuj
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(p.id)}>
                    Usuń
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <p>
                  Trening: {p.training_kcal ?? "–"} kcal · B {p.training_protein ?? "–"} · T{" "}
                  {p.training_fat ?? "–"} · W {p.training_carbs ?? "–"}
                </p>
                <p>
                  Nietreningowy: {p.rest_kcal ?? "–"} kcal · B {p.rest_protein ?? "–"} · T{" "}
                  {p.rest_fat ?? "–"} · W {p.rest_carbs ?? "–"}
                </p>
              </div>
              {p.notes ? (
                <p className="whitespace-pre-wrap rounded-md bg-secondary/50 p-3 text-sm">{p.notes}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
