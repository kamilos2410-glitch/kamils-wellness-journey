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
import { parseWorkoutReport } from "@/lib/workout-report";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/treningi")({
  head: () => ({
    meta: [
      { title: "Plany treningowe – Forma" },
      { name: "description", content: "Tekstowe plany treningowe z datą rozpoczęcia i dziennik sesji." },
      { property: "og:title", content: "Plany treningowe – Forma" },
      { property: "og:description", content: "Tekstowe plany treningowe z datą rozpoczęcia i dziennik sesji." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Treningi,
});

function Treningi() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(todayISO());
  const [content, setContent] = useState("");
  const [active, setActive] = useState(true);
  const [openPlan, setOpenPlan] = useState<string | null>(null);
  const parsedPlan = parseWorkoutReport(content);

  const [sessionDate, setSessionDate] = useState(todayISO());
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [openSession, setOpenSession] = useState<string | null>(null);
  const parsedReport = parseWorkoutReport(sessionNotes);


  const { data: plans } = useQuery({
    queryKey: ["workout_plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_plans")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ["workout_sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("*")
        .order("session_date", { ascending: false })
        .limit(40);
      if (error) throw error;
      return data;
    },
  });

  const savePlan = useMutation({
    mutationFn: async () => {
      const user_id = await currentUserId();
      const planTitle = title.trim() || parsedPlan.title || "";
      if (!planTitle) throw new Error("Podaj nazwę planu");
      const { error } = await supabase.from("workout_plans").insert({
        user_id,
        title: planTitle.slice(0, 160),
        start_date: parsedPlan.date ?? start,
        content: content.trim().slice(0, 20000) || null,
        is_active: active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan treningowy zapisany");
      setTitle("");
      setContent("");
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Błąd zapisu"),
  });

  const saveSession = useMutation({
    mutationFn: async () => {
      const user_id = await currentUserId();
      const { error } = await supabase.from("workout_sessions").insert({
        user_id,
        session_date: parsedReport.date ?? sessionDate,
        title: (sessionTitle.trim() || parsedReport.title || "").slice(0, 160) || null,
        notes: sessionNotes.trim().slice(0, 20000) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Trening zapisany");
      setSessionNotes("");
      setSessionTitle("");
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Błąd zapisu"),
  });

  const removeSession = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workout_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });


  const removePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workout_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  const togglePlanActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("workout_plans").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Błąd zapisu"),
  });

  const sortedPlans = [...(plans ?? [])].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return b.start_date.localeCompare(a.start_date);
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Treningi" subtitle="Plan tekstowy + dziennik odbytych sesji" />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Nowy plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="content">Treść planu (możesz wkleić eksport ze Strong)</Label>
            <Textarea
              id="content"
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"Push A\n\nBulgarian Split Squat\nSet 1: 6 kg × 10..."}
            />
          </div>

          {content.trim() ? (
            <div className="space-y-2 rounded-lg bg-secondary/40 p-3 text-sm">
              <p className="font-medium">{title.trim() || parsedPlan.title || "Bez nazwy"}</p>
              <p className="text-xs text-muted-foreground">
                od {plDate(parsedPlan.date ?? start)} · {parsedPlan.exercises.length} ćwiczeń
              </p>
              <div className="flex flex-wrap gap-1.5">
                {parsedPlan.exercises.map((ex, i) => (
                  <span key={i} className="rounded bg-background px-2 py-0.5 text-[11px]">
                    {ex.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="title">Nazwa</Label>
              <Input
                id="title"
                value={title || parsedPlan.title || ""}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="start">Data rozpoczęcia</Label>
              <Input
                id="start"
                type="date"
                value={parsedPlan.date ?? start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="wactive" checked={active} onCheckedChange={setActive} />
            <Label htmlFor="wactive">Aktywny plan</Label>
          </div>
          <Button onClick={() => savePlan.mutate()} disabled={savePlan.isPending}>
            Zapisz plan
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Wklej raport z treningu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="snotes">Raport</Label>
            <Textarea
              id="snotes"
              rows={6}
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder={"Push A\nMonday, 2 March 2026 at 18:00\n\nBulgarian Split Squat\nSet 1: 6 kg × 10..."}
            />
          </div>

          {sessionNotes.trim() ? (
            <div className="space-y-2 rounded-lg bg-secondary/40 p-3 text-sm">
              <p className="font-medium">{sessionTitle.trim() || parsedReport.title || "Bez nazwy"}</p>
              <p className="text-xs text-muted-foreground">
                {plDate(parsedReport.date ?? sessionDate)} · {parsedReport.exercises.length} ćwiczeń
              </p>
              <div className="flex flex-wrap gap-1.5">
                {parsedReport.exercises.map((ex, i) => (
                  <span key={i} className="rounded bg-background px-2 py-0.5 text-[11px]">
                    {ex.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="stitle">Nazwa treningu</Label>
              <Input
                id="stitle"
                value={sessionTitle || parsedReport.title || ""}
                onChange={(e) => setSessionTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sdate">Data</Label>
              <Input
                id="sdate"
                type="date"
                value={parsedReport.date ?? sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={() => saveSession.mutate()} disabled={saveSession.isPending || !sessionNotes.trim()}>
            Zapisz trening
          </Button>

          <div className="space-y-2 pt-2">
            {sessions?.map((s) => {
              const detail = parseWorkoutReport(s.notes ?? "");
              const isOpen = openSession === s.id;
              return (
                <div key={s.id} className="rounded-md bg-secondary/40 px-3 py-2 text-sm">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 text-left"
                    onClick={() => setOpenSession(isOpen ? null : s.id)}
                  >
                    <span>
                      <span className="font-medium">{s.title || detail.title || "Trening"}</span>
                      <span className="block text-xs text-muted-foreground">
                        {plDate(s.session_date)}
                        {detail.exercises.length ? ` · ${detail.exercises.length} ćwiczeń` : ""}
                      </span>
                    </span>
                    <span className="text-muted-foreground">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen ? (
                    <div className="mt-2 space-y-3 border-t border-border pt-2">
                      {detail.exercises.length ? (
                        detail.exercises.map((ex, i) => (
                          <div key={i}>
                            <p className="text-sm font-medium">{ex.name}</p>
                            <div className="mt-0.5 space-y-0.5">
                              {ex.lines.map((l, j) => (
                                <p key={j} className="text-xs text-muted-foreground">
                                  {l}
                                </p>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="whitespace-pre-wrap text-xs text-muted-foreground">{s.notes}</p>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => removeSession.mutate(s.id)}>
                        Usuń
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>


      <div className="space-y-3">
        {sortedPlans.map((p) => {
          const detail = parseWorkoutReport(p.content ?? "");
          const isOpen = openPlan === p.id;
          return (
            <Card key={p.id}>
              <CardContent className="space-y-2 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => setOpenPlan(isOpen ? null : p.id)}
                  >
                    <p className="font-medium">
                      {p.title}
                      {p.is_active ? (
                        <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] uppercase text-primary">
                          aktywny
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      od {plDate(p.start_date)}
                      {detail.exercises.length ? ` · ${detail.exercises.length} ćwiczeń` : ""}
                    </p>
                  </button>
                  <span className="text-muted-foreground">{isOpen ? "−" : "+"}</span>
                </div>
                {isOpen ? (
                  <div className="space-y-3 border-t border-border pt-2">
                    {detail.exercises.length ? (
                      detail.exercises.map((ex, i) => (
                        <div key={i}>
                          <p className="text-sm font-medium">{ex.name}</p>
                          <div className="mt-0.5 space-y-0.5">
                            {ex.lines.map((l, j) => (
                              <p key={j} className="text-xs text-muted-foreground">
                                {l}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : p.content ? (
                      <p className="whitespace-pre-wrap rounded-md bg-secondary/50 p-3 text-sm">
                        {p.content}
                      </p>
                    ) : null}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`active-${p.id}`}
                          checked={p.is_active}
                          onCheckedChange={(v) => togglePlanActive.mutate({ id: p.id, is_active: v })}
                        />
                        <Label htmlFor={`active-${p.id}`} className="text-xs">
                          {p.is_active ? "Aktywny" : "Zakończony"}
                        </Label>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removePlan.mutate(p.id)}>
                        Usuń
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
