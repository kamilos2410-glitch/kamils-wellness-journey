import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/AppShell";
import { currentUserId, plDate, todayISO } from "@/lib/db";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart as ReLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/pomiary")({
  head: () => ({
    meta: [
      { title: "Pomiary i postępy – Forma" },
      { name: "description", content: "Raporty pomiarowe z konkretnych dni, historia parametrów i wykresy postępu." },
      { property: "og:title", content: "Pomiary i postępy – Forma" },
      { property: "og:description", content: "Raporty pomiarowe z konkretnych dni, historia parametrów i wykresy postępu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Pomiary,
});

type MetricDef = { value: string; label: string; unit: string };

const BODY: MetricDef[] = [
  { value: "waga", label: "Waga", unit: "kg" },
  { value: "tkanka_tluszczowa", label: "Tkanka tłuszczowa", unit: "mm" },
  { value: "szyja", label: "Szyja", unit: "cm" },
  { value: "klatka", label: "Klatka", unit: "cm" },
  { value: "biceps", label: "Biceps", unit: "cm" },
  { value: "talia", label: "Talia", unit: "cm" },
  { value: "brzuch", label: "Brzuch", unit: "cm" },
  { value: "biodra", label: "Biodra", unit: "cm" },
  { value: "udo", label: "Udo", unit: "cm" },
  { value: "lydka", label: "Łydka", unit: "cm" },
];

const DAILY: MetricDef[] = [
  { value: "sen", label: "Sen", unit: "h" },
  { value: "kroki", label: "Kroki", unit: "kroki" },
  { value: "energia", label: "Energia", unit: "pkt" },
];

const ALL = [...BODY, ...DAILY];
const defOf = (m: string) => ALL.find((d) => d.value === m);
const labelOf = (m: string) => defOf(m)?.label ?? m;

type Row = {
  id: string;
  metric: string;
  value: number;
  unit: string;
  measured_at: string;
};

const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return v.trim() === "" || !Number.isFinite(n) ? null : n;
};

function Pomiary() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("raporty");
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [openMetric, setOpenMetric] = useState<string | null>(null);

  const { data: rows } = useQuery({
    queryKey: ["measurements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("measurements")
        .select("id,metric,value,unit,measured_at")
        .order("measured_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, value: Number(r.value) })) as Row[];
    },
  });

  const bodyRows = useMemo(
    () => (rows ?? []).filter((r) => BODY.some((b) => b.value === r.metric)),
    [rows],
  );
  const dailyRows = useMemo(
    () => (rows ?? []).filter((r) => DAILY.some((b) => b.value === r.metric)),
    [rows],
  );

  const latest = useMemo(() => {
    const map: Record<string, { value: number; unit: string; date: string }> = {};
    for (const r of rows ?? []) {
      if (!map[r.metric]) map[r.metric] = { value: r.value, unit: r.unit, date: r.measured_at };
    }
    return map;
  }, [rows]);

  const reports = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of bodyRows) {
      const arr = map.get(r.measured_at) ?? [];
      arr.push(r);
      map.set(r.measured_at, arr);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [bodyRows]);

  const dailyByDate = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of dailyRows) {
      const arr = map.get(r.measured_at) ?? [];
      arr.push(r);
      map.set(r.measured_at, arr);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [dailyRows]);

  const saveMany = useMutation({
    mutationFn: async ({
      date,
      values,
    }: {
      date: string;
      values: { metric: string; value: number; unit: string }[];
    }) => {
      const user_id = await currentUserId();
      if (!values.length) throw new Error("Nie wpisano żadnej wartości");
      await supabase
        .from("measurements")
        .delete()
        .eq("measured_at", date)
        .in(
          "metric",
          values.map((v) => v.metric),
        );
      const { error } = await supabase
        .from("measurements")
        .insert(values.map((v) => ({ ...v, user_id, measured_at: date })));
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Zapisano");
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Błąd zapisu"),
  });

  const removeDate = useMutation({
    mutationFn: async ({ date, metrics }: { date: string; metrics: string[] }) => {
      const { error } = await supabase
        .from("measurements")
        .delete()
        .eq("measured_at", date)
        .in("metric", metrics);
      if (error) throw error;
    },
    onSuccess: () => {
      setOpenDate(null);
      qc.invalidateQueries();
    },
  });

  // ---- detail: single report (date) ----
  if (openDate) {
    const list = reports.find(([d]) => d === openDate)?.[1] ?? [];
    const prev = reports[reports.findIndex(([d]) => d === openDate) + 1]?.[1] ?? [];
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setOpenDate(null)}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Raporty
        </Button>
        <PageHeader title={plDate(openDate)} subtitle={`${list.length} parametrów`} />
        <Card>
          <CardContent className="space-y-2 pt-5">
            {BODY.filter((b) => list.some((r) => r.metric === b.value)).map((b) => {
              const cur = list.find((r) => r.metric === b.value)!;
              const old = prev.find((r) => r.metric === b.value);
              const diff = old ? cur.value - old.value : null;
              return (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => {
                    setOpenDate(null);
                    setTab("parametry");
                    setOpenMetric(b.value);
                  }}
                  className="flex w-full items-center justify-between rounded-md bg-secondary/40 px-3 py-2 text-left text-sm"
                >
                  <span>{b.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">
                      {cur.value} {cur.unit}
                    </span>
                    {diff !== null && diff !== 0 ? (
                      <span
                        className={`text-xs ${diff > 0 ? "text-primary" : "text-muted-foreground"}`}
                      >
                        {diff > 0 ? "+" : ""}
                        {diff.toFixed(1)}
                      </span>
                    ) : null}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </span>
                </button>
              );
            })}
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                removeDate.mutate({ date: openDate, metrics: list.map((r) => r.metric) })
              }
            >
              Usuń cały raport
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- detail: single metric ----
  if (openMetric) {
    const def = defOf(openMetric);
    const series = (rows ?? [])
      .filter((r) => r.metric === openMetric)
      .slice()
      .sort((a, b) => (a.measured_at < b.measured_at ? -1 : 1));
    const chart = series.map((r) => ({ date: plDate(r.measured_at).slice(0, 5), value: r.value }));
    const first = series[0]?.value ?? null;
    const last = series[series.length - 1]?.value ?? null;
    const delta = first !== null && last !== null ? last - first : null;
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setOpenMetric(null)}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Parametry
        </Button>
        <PageHeader
          title={labelOf(openMetric)}
          subtitle={
            delta !== null
              ? `${series.length} pomiarów · zmiana ${delta > 0 ? "+" : ""}${delta.toFixed(1)} ${def?.unit ?? ""}`
              : "Brak danych"
          }
        />
        {chart.length > 1 ? (
          <Card>
            <CardContent className="h-64 pt-5">
              <ResponsiveContainer width="100%" height="100%">
                <ReLineChart data={chart} margin={{ left: -18, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" fontSize={11} stroke="var(--muted-foreground)" minTickGap={16} />
                  <YAxis domain={["auto", "auto"]} fontSize={11} stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--popover-foreground)",
                    }}
                  />
                  <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} dot />
                </ReLineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Wszystkie wyniki</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {series
              .slice()
              .reverse()
              .map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{plDate(r.measured_at)}</span>
                  <span className="font-medium">
                    {r.value} {r.unit}
                  </span>
                </div>
              ))}
            {series.length ? null : (
              <p className="text-sm text-muted-foreground">Brak wyników.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Pomiary" subtitle="Raporty pomiarowe, parametry i dzienne nawyki" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="raporty">Raporty</TabsTrigger>
          <TabsTrigger value="parametry">Parametry</TabsTrigger>
          <TabsTrigger value="codziennie">Dzień</TabsTrigger>
          <TabsTrigger value="nowy">Nowy</TabsTrigger>
        </TabsList>

        <TabsContent value="raporty" className="mt-4 space-y-2">
          {reports.length ? (
            reports.map(([date, list]) => (
              <button
                key={date}
                type="button"
                onClick={() => setOpenDate(date)}
                className="flex w-full items-center justify-between rounded-lg bg-secondary/40 px-3 py-3 text-left"
              >
                <div>
                  <p className="font-medium">{plDate(date)}</p>
                  <p className="text-xs text-muted-foreground">
                    {list.length} parametrów ·{" "}
                    {list.find((r) => r.metric === "waga")
                      ? `waga ${list.find((r) => r.metric === "waga")!.value} kg`
                      : "bez wagi"}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Brak raportów.</p>
          )}
        </TabsContent>

        <TabsContent value="parametry" className="mt-4 space-y-2">
          {ALL.map((m) => {
            const list = (rows ?? []).filter((r) => r.metric === m.value);
            const latest = list[0];
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setOpenMetric(m.value)}
                className="flex w-full items-center justify-between rounded-lg bg-secondary/40 px-3 py-3 text-left"
              >
                <div>
                  <p className="font-medium">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{list.length} pomiarów</p>
                </div>
                <span className="flex items-center gap-2 text-sm">
                  {latest ? `${latest.value} ${latest.unit}` : "–"}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </span>
              </button>
            );
          })}
        </TabsContent>

        <TabsContent value="codziennie" className="mt-4 space-y-4">
          <DailyForm latest={latest} onSave={(date, values) => saveMany.mutate({ date, values })} />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Historia dzienna</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dailyByDate.length ? (
                dailyByDate.slice(0, 60).map(([date, list]) => (
                  <div
                    key={date}
                    className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">{plDate(date)}</span>
                    <span className="flex gap-3">
                      {DAILY.map((d) => {
                        const r = list.find((x) => x.metric === d.value);
                        return r ? (
                          <span key={d.value}>
                            {d.label === "Kroki" ? "👟" : d.label === "Sen" ? "😴" : "⚡"} {r.value}
                          </span>
                        ) : null;
                      })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Brak wpisów.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nowy" className="mt-4">
          <ReportForm
            latest={latest}
            pending={saveMany.isPending}
            onSave={(date, values) => saveMany.mutate({ date, values })}
          />
        </TabsContent>
      </Tabs>

    </div>
  );
}

type LatestMap = Record<string, { value: number; unit: string; date: string }>;

function LastHint({ latest, metric }: { latest: LatestMap; metric: string }) {
  const l = latest[metric];
  if (!l) return null;
  return (
    <p className="text-[11px] leading-tight text-muted-foreground">
      ostatnio: {l.value} {l.unit} ({plDate(l.date)})
    </p>
  );
}

function ReportForm({
  onSave,
  pending,
  latest,
}: {
  onSave: (date: string, values: { metric: string; value: number; unit: string }[]) => void;
  pending: boolean;
  latest: LatestMap;
}) {
  const [date, setDate] = useState(todayISO());
  const [vals, setVals] = useState<Record<string, string>>({});

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Nowy raport pomiarowy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="rdate">Data raportu</Label>
          <Input id="rdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {BODY.map((m) => (
            <div key={m.value} className="space-y-1.5">
              <Label htmlFor={m.value}>
                {m.label} <span className="text-muted-foreground">({m.unit})</span>
              </Label>
              <Input
                id={m.value}
                inputMode="decimal"
                placeholder={latest[m.value] ? String(latest[m.value]!.value) : ""}
                value={vals[m.value] ?? ""}
                onChange={(e) => setVals({ ...vals, [m.value]: e.target.value })}
              />
              <LastHint latest={latest} metric={m.value} />
            </div>
          ))}
        </div>
        <Button
          disabled={pending}
          onClick={() => {
            const values = BODY.map((m) => ({ metric: m.value, value: num(vals[m.value] ?? ""), unit: m.unit }))
              .filter((v): v is { metric: string; value: number; unit: string } => v.value !== null);
            onSave(date, values);
            setVals({});
          }}
        >
          Zapisz raport
        </Button>
      </CardContent>
    </Card>
  );
}

function DailyForm({
  onSave,
  latest,
}: {
  onSave: (date: string, values: { metric: string; value: number; unit: string }[]) => void;
  latest: LatestMap;
}) {
  const [date, setDate] = useState(todayISO());
  const [vals, setVals] = useState<Record<string, string>>({});

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Dzienny wpis (sen, kroki, energia)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="ddate">Data</Label>
          <Input id="ddate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {DAILY.map((m) => (
            <div key={m.value} className="space-y-1.5">
              <Label htmlFor={`d-${m.value}`}>{m.label}</Label>
              <Input
                id={`d-${m.value}`}
                inputMode="decimal"
                placeholder={latest[m.value] ? String(latest[m.value]!.value) : ""}
                value={vals[m.value] ?? ""}
                onChange={(e) => setVals({ ...vals, [m.value]: e.target.value })}
              />
              <LastHint latest={latest} metric={m.value} />
            </div>
          ))}
        </div>
        <Button
          onClick={() => {
            const values = DAILY.map((m) => ({ metric: m.value, value: num(vals[m.value] ?? ""), unit: m.unit }))
              .filter((v): v is { metric: string; value: number; unit: string } => v.value !== null);
            onSave(date, values);
            setVals({});
          }}
        >
          Zapisz dzień
        </Button>
      </CardContent>
    </Card>
  );
}

