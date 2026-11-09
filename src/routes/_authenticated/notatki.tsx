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

export const Route = createFileRoute("/_authenticated/notatki")({
  head: () => ({
    meta: [
      { title: "Notatki zdrowotne – Forma" },
      { name: "description", content: "Zapisuj wyniki badań, samopoczucie i notatki z iPhone'a w jednym miejscu." },
      { property: "og:title", content: "Notatki zdrowotne – Forma" },
      { property: "og:description", content: "Zapisuj wyniki badań, samopoczucie i notatki z iPhone'a w jednym miejscu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Notatki,
});

function Notatki() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [content, setContent] = useState("");

  const { data: notes } = useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("note_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const user_id = await currentUserId();
      if (!content.trim()) throw new Error("Notatka jest pusta");
      const { error } = await supabase.from("notes").insert({
        user_id,
        title: title.trim().slice(0, 160) || "Notatka",
        note_date: date,
        content: content.trim().slice(0, 20000),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notatka zapisana");
      setTitle("");
      setContent("");
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Błąd zapisu"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Notatki" subtitle="Zdrowie, badania, samopoczucie, wklejki z iPhone'a" />

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ntitle">Tytuł</Label>
              <Input id="ntitle" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ndate">Data</Label>
              <Input id="ndate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ncontent">Treść</Label>
            <Textarea
              id="ncontent"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Zapisz notatkę
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {notes?.map((n) => (
          <Card key={n.id}>
            <CardContent className="space-y-1 pt-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{n.title ?? "Notatka"}</p>
                  <p className="text-xs text-muted-foreground">{plDate(n.note_date)}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(n.id)}>
                  Usuń
                </Button>
              </div>
              <p className="whitespace-pre-wrap text-sm">{n.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
