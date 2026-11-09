import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/AppShell";
import { currentUserId, plDate, todayISO } from "@/lib/db";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/zdjecia")({
  head: () => ({
    meta: [
      { title: "Zdjęcia sylwetki – Forma" },
      { name: "description", content: "Prywatna galeria zdjęć postępów z datą, także historycznych." },
      { property: "og:title", content: "Zdjęcia sylwetki – Forma" },
      { property: "og:description", content: "Prywatna galeria zdjęć postępów z datą, także historycznych." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Zdjecia,
});

type Photo = {
  id: string;
  photo_date: string;
  caption: string | null;
  storage_path: string;
  angle: string | null;
  pose: string | null;
};

/** Zmniejsza zdjęcie w przeglądarce – dużo szybszy upload z telefonu. */
async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

/** Mały podgląd (max 720 px, JPEG 70%) zapisywany w bazie – awaryjny kanał odczytu dla AI. */
async function makePreview(
  file: File,
): Promise<{ preview_base64: string; mime_type: string; width: number; height: number } | null> {
  if (!file.type.startsWith("image/")) return null;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 720 / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    return {
      preview_base64: dataUrl.split(",")[1] ?? "",
      mime_type: "image/jpeg",
      width: w,
      height: h,
    };
  } catch {
    return null;
  }
}


const ANGLES = [
  { value: "przod", label: "Przód" },
  { value: "bok", label: "Bok" },
  { value: "tyl", label: "Tył" },
] as const;

const POSES = [
  { value: "relaxed", label: "Relaxed" },
  { value: "napiete", label: "Napięte" },
] as const;

/** Domyślna sugestia kolejności zestawu: przód/bok/tył relaxed, potem ujęcia napięte. */
function suggestMeta(index: number) {
  const cycle = ["przod", "bok", "tyl"];
  return {
    angle: cycle[index % 3] ?? "przod",
    pose: index < 3 ? "relaxed" : "napiete",
  };
}

function Zdjecia() {
  const qc = useQueryClient();
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [meta, setMeta] = useState<{ angle: string; pose: string }[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const { data: photos } = useQuery({
    queryKey: ["progress_photos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progress_photos")
        .select("id,photo_date,caption,storage_path,angle,pose")
        .order("position", { ascending: true })
        .order("photo_date", { ascending: false });
      if (error) throw error;
      return data as Photo[];
    },
  });

  // Jedno wywołanie na wszystkie miniatury zamiast osobnego zapytania per zdjęcie.
  const { data: urlMap } = useQuery({
    queryKey: ["progress_photo_urls", photos?.map((p) => p.storage_path).join(",")],
    enabled: !!photos?.length,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const paths = photos!.map((p) => p.storage_path);
      const { data, error } = await supabase.storage
        .from("progress-photos")
        .createSignedUrls(paths, 3600);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const item of data ?? []) if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
      return map;
    },
  });

  const upload = async () => {
    if (!files?.length) return;
    const list = Array.from(files);
    setProgress({ done: 0, total: list.length });
    try {
      const user_id = await currentUserId();
      const caption = note.trim().slice(0, 500) || null;

      const results = await Promise.all(
        list.map(async (file, i) => {
          const [blob, preview] = await Promise.all([compressImage(file), makePreview(file)]);
          const ext = blob.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop()?.toLowerCase() ?? "jpg");
          const path = `${user_id}/${date}-${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("progress-photos")
            .upload(path, blob, { contentType: blob.type || file.type });
          if (upErr) throw upErr;
          setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
          const m = meta[i] ?? suggestMeta(i);
          return {
            row: {
              user_id,
              storage_path: path,
              photo_date: date,
              caption,
              angle: m.angle,
              pose: m.pose,
              position: i + 1,
            },
            preview,
          };
        }),
      );

      const { data: inserted, error } = await supabase
        .from("progress_photos")
        .insert(results.map((r) => r.row))
        .select("id,storage_path");
      if (error) throw error;

      // Podglądy w bazie – awaryjny kanał odczytu obrazów dla asystenta AI.
      const previewRows = (inserted ?? [])
        .map((row) => {
          const match = results.find((r) => r.row.storage_path === row.storage_path);
          if (!match?.preview) return null;
          return { photo_id: row.id, user_id, ...match.preview };
        })
        .filter((r): r is NonNullable<typeof r> => !!r);
      if (previewRows.length) {
        await supabase.from("progress_photo_previews").upsert(previewRows, { onConflict: "photo_id" });
      }


      toast.success(`Dodano ${results.length} zdjęć`);
      setFiles(null);
      setMeta([]);
      setNote("");
      qc.invalidateQueries({ queryKey: ["progress_photos"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd przesyłania");
    } finally {
      setProgress(null);
    }
  };

  const removeGroup = useMutation({
    mutationFn: async (items: Photo[]) => {
      await supabase.storage.from("progress-photos").remove(items.map((i) => i.storage_path));
      const { error } = await supabase
        .from("progress_photos")
        .delete()
        .in("id", items.map((i) => i.id));
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["progress_photos"] }),
  });

  const removeOne = useMutation({
    mutationFn: async (photo: Photo) => {
      await supabase.storage.from("progress-photos").remove([photo.storage_path]);
      const { error } = await supabase.from("progress_photos").delete().eq("id", photo.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["progress_photos"] }),
  });

  const groups = Object.entries(
    (photos ?? []).reduce<Record<string, Photo[]>>((acc, p) => {
      (acc[p.photo_date] ||= []).push(p);
      return acc;
    }, {}),
  ).sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <div className="space-y-4">
      <PageHeader title="Zdjęcia" subtitle="Dodawaj też stare zdjęcia – wystarczy ustawić datę" />

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pdate">Data zdjęć</Label>
              <Input id="pdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pfiles">Pliki</Label>
              <Input
                id="pfiles"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const list = e.target.files;
                  setFiles(list);
                  setMeta(Array.from({ length: list?.length ?? 0 }, (_, i) => suggestMeta(i)));
                }}
              />
            </div>
          </div>
          {files?.length ? (
            <div className="space-y-2 rounded-xl border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">
                Ustaw ujęcie i pozę dla każdego zdjęcia (kolejność jak wybrane pliki).
              </p>
              {Array.from(files).map((file, i) => (
                <div key={file.name + i} className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-xs text-muted-foreground">{i + 1}.</span>
                  <span className="min-w-0 flex-1 truncate text-xs">{file.name}</span>
                  <select
                    aria-label={`Ujęcie zdjęcia ${i + 1}`}
                    className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                    value={meta[i]?.angle ?? suggestMeta(i).angle}
                    onChange={(e) =>
                      setMeta((m) => {
                        const next = [...m];
                        next[i] = { ...(next[i] ?? suggestMeta(i)), angle: e.target.value };
                        return next;
                      })
                    }
                  >
                    {ANGLES.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label={`Poza zdjęcia ${i + 1}`}
                    className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                    value={meta[i]?.pose ?? suggestMeta(i).pose}
                    onChange={(e) =>
                      setMeta((m) => {
                        const next = [...m];
                        next[i] = { ...(next[i] ?? suggestMeta(i)), pose: e.target.value };
                        return next;
                      })
                    }
                  >
                    {POSES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="pnote">Opis (opcjonalnie)</Label>
            <Textarea id="pnote" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button onClick={upload} disabled={!!progress || !files?.length}>
            {progress ? `Przesyłanie ${progress.done}/${progress.total}...` : "Dodaj zdjęcia"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-5">
        {groups.map(([groupDate, items]) => (
          <section key={groupDate} className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{plDate(groupDate)}</h2>
                {items.find((i) => i.caption) ? (
                  <p className="text-sm text-muted-foreground">{items.find((i) => i.caption)!.caption}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{items.length} zdj.</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="px-2 text-xs"
                  onClick={() => removeGroup.mutate(items)}
                >
                  Usuń serię
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {items.map((p) => {
                const url = urlMap?.[p.storage_path];
                return (
                  <div key={p.id} className="group relative overflow-hidden rounded-xl border border-border/60 bg-card">
                    {url ? (
                      <img
                        src={url}
                        alt={`Zdjęcie sylwetki z ${plDate(p.photo_date)}`}
                        className="aspect-3/4 w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="aspect-3/4 w-full animate-pulse bg-secondary" />
                    )}
                    <span className="absolute bottom-1 left-1 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground backdrop-blur">
                      {[p.angle, p.pose].filter(Boolean).join(" · ")}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeOne.mutate(p)}
                      className="absolute right-1 top-1 rounded-md bg-background/80 px-2 py-0.5 text-[11px] text-muted-foreground backdrop-blur"
                    >
                      Usuń
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
