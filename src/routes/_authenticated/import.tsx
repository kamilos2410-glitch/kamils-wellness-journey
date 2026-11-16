import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/AppShell";
import { currentUserId } from "@/lib/db";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/import")({
  head: () => ({
    meta: [
      { title: "Import danych – Forma" },
      { name: "description", content: "Wgraj arkusz Excel lub CSV z historią wagi i pomiarów, a dane trafią do bazy." },
      { property: "og:title", content: "Import danych – Forma" },
      { property: "og:description", content: "Wgraj arkusz Excel lub CSV z historią wagi i pomiarów, a dane trafią do bazy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ImportPage,
});

type Row = Record<string, unknown>;

function toISODate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const d = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    return d.toISOString().slice(0, 10);
  }
  if (typeof value === "string") {
    const m = value.trim().match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})$/);
    if (m) {
      const [, d, mo, y] = m;
      const year = y!.length === 2 ? `20${y}` : y;
      return `${year}-${mo!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
    }
    const iso = value.trim().match(/^\d{4}-\d{2}-\d{2}/);
    if (iso) return iso[0];
  }
  return null;
}

const toNumber = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/\s/g, "").replace(",", "."));
    if (Number.isFinite(n) && v.trim() !== "") return n;
  }
  return null;
};

function ImportPage() {
  const qc = useQueryClient();
  const [sheets, setSheets] = useState<string[]>([]);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheet, setSheet] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [dateCol, setDateCol] = useState("");
  const [valueCol, setValueCol] = useState("");
  const [metric, setMetric] = useState("waga");
  const [unit, setUnit] = useState("kg");
  const [busy, setBusy] = useState(false);

  const columns = rows.length ? Object.keys(rows[0] as Row) : [];

  const loadSheet = (wb: XLSX.WorkBook, name: string) => {
    const ws = wb.Sheets[name];
    if (!ws) return;
    const json = XLSX.utils.sheet_to_json<Row>(ws, { defval: null, raw: true });
    setSheet(name);
    setRows(json.slice(0, 2000));
    setDateCol("");
    setValueCol("");
  };

  const onFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { cellDates: true });
    setWorkbook(wb);
    setSheets(wb.SheetNames);
    if (wb.SheetNames[0]) loadSheet(wb, wb.SheetNames[0]);
  };

  const preview = rows
    .map((r) => ({ date: toISODate(r[dateCol]), value: toNumber(r[valueCol]) }))
    .filter((r) => r.date && r.value !== null);

  const runImport = async () => {
    if (!preview.length) {
      toast.error("Brak wierszy do zaimportowania");
      return;
    }
    setBusy(true);
    try {
      const user_id = await currentUserId();
      const payload = preview.map((r) => ({
        user_id,
        metric: metric.trim().slice(0, 60) || "waga",
        value: r.value as number,
        unit: unit.trim().slice(0, 12),
        measured_at: r.date as string,
      }));
      for (let i = 0; i < payload.length; i += 200) {
        const { error } = await supabase.from("measurements").insert(payload.slice(i, i + 200));
        if (error) throw error;
      }
      toast.success(`Zaimportowano ${payload.length} pomiarów`);
      qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd importu");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Import"
        subtitle="Wgraj plik .xlsx lub .csv (np. arkusz „Pomiary – historia”) i przenieś historię pomiarów"
      />

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="space-y-1.5">
            <Label htmlFor="file">Plik arkusza</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
          </div>

          {sheets.length > 1 && workbook ? (
            <div className="space-y-1.5">
              <Label>Arkusz</Label>
              <Select value={sheet} onValueChange={(v) => loadSheet(workbook, v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sheets.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {columns.length ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Kolumna z datą</Label>
                  <Select value={dateCol} onValueChange={setDateCol}>
                    <SelectTrigger>
                      <SelectValue placeholder="wybierz" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Kolumna z wartością</Label>
                  <Select value={valueCol} onValueChange={setValueCol}>
                    <SelectTrigger>
                      <SelectValue placeholder="wybierz" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="metric">Nazwa pomiaru</Label>
                  <Input id="metric" value={metric} onChange={(e) => setMetric(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unit">Jednostka</Label>
                  <Input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Rozpoznane wiersze: <span className="text-foreground">{preview.length}</span>
              </p>

              <Button onClick={runImport} disabled={busy || !preview.length}>
                Importuj do pomiarów
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>

      {rows.length ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Podgląd danych ({rows.length} wierszy)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  {columns.slice(0, 8).map((c) => (
                    <th key={c} className="px-2 py-1 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 15).map((r, i) => (
                  <tr key={i} className="border-t border-border/50">
                    {columns.slice(0, 8).map((c) => (
                      <td key={c} className="px-2 py-1">
                        {r[c] instanceof Date
                          ? (r[c] as Date).toLocaleDateString("pl-PL")
                          : String(r[c] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
