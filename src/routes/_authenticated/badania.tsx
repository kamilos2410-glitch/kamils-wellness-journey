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
import { FileText, Paperclip, Trash2 } from "lucide-react";

const title = "Badania lekarskie – Forma";
const description =
  "Przechowuj wyniki badań lekarskich z datą, kategorią i krótkim opisem, razem ze skanami i PDF-ami.";

export const Route = createFileRoute("/_authenticated/badania")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Badania,
});

type Exam = {
  id: string;
  exam_date: string;
  title: string;
  category: string;
  description: string | null;
  storage_path: string | null;
  file_name: string | null;
};

type ExamFile = {
  id: string;
  exam_id: string;
  storage_path: string;
  file_name: string | null;
};

function Badania() {
  const qc = useQueryClient();
  const [examTitle, setExamTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: exams } = useQuery({
    queryKey: ["medical_exams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_exams")
        .select("id,exam_date,title,category,description,storage_path,file_name")
        .order("exam_date", { ascending: false });
      if (error) throw error;
      return data as Exam[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const user_id = await currentUserId();
      if (!examTitle.trim()) throw new Error("Podaj nazwę badania");

      let storage_path: string | null = null;
      let file_name: string | null = null;
      let mime_type: string | null = null;

      if (file) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${user_id}/${date}-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("medical-exams")
          .upload(path, file, { contentType: file.type || "application/octet-stream" });
        if (upErr) throw upErr;
        storage_path = path;
        file_name = file.name;
        mime_type = file.type || null;
      }

      const { error } = await supabase.from("medical_exams").insert({
        user_id,
        exam_date: date,
        title: examTitle.trim().slice(0, 160),
        category: category.trim().slice(0, 60) || "inne",
        description: desc.trim().slice(0, 5000) || null,
        storage_path,
        file_name,
        mime_type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Badanie zapisane");
      setExamTitle("");
      setCategory("");
      setDesc("");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["medical_exams"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (exam: Exam) => {
      const { data: attached } = await supabase
        .from("medical_exam_files")
        .select("storage_path")
        .eq("exam_id", exam.id);
      const paths = [
        ...(exam.storage_path ? [exam.storage_path] : []),
        ...(attached ?? []).map((f) => f.storage_path),
      ];
      if (paths.length) {
        await supabase.storage.from("medical-exams").remove(paths);
      }
      const { error } = await supabase.from("medical_exams").delete().eq("id", exam.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usunięto");
      qc.invalidateQueries({ queryKey: ["medical_exams"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: examFiles } = useQuery({
    queryKey: ["medical_exam_files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_exam_files")
        .select("id,exam_id,storage_path,file_name")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ExamFile[];
    },
  });

  const addFiles = useMutation({
    mutationFn: async ({ exam, files }: { exam: Exam; files: File[] }) => {
      const user_id = await currentUserId();
      for (const f of files) {
        const ext = f.name.split(".").pop() ?? "bin";
        const path = `${user_id}/${exam.exam_date}-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("medical-exams")
          .upload(path, f, { contentType: f.type || "application/octet-stream" });
        if (upErr) throw upErr;
        const { error } = await supabase.from("medical_exam_files").insert({
          exam_id: exam.id,
          user_id,
          storage_path: path,
          file_name: f.name,
          mime_type: f.type || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Załącznik dodany");
      qc.invalidateQueries({ queryKey: ["medical_exam_files"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeFile = useMutation({
    mutationFn: async (f: ExamFile) => {
      await supabase.storage.from("medical-exams").remove([f.storage_path]);
      const { error } = await supabase.from("medical_exam_files").delete().eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Załącznik usunięty");
      qc.invalidateQueries({ queryKey: ["medical_exam_files"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openFile = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("medical-exams")
      .createSignedUrl(path, 3600);
    if (error || !data) {
      toast.error("Nie udało się otworzyć pliku");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  return (
    <>
      <PageHeader
        title="Badania"
        subtitle="Wyniki badań lekarskich z datą, opisem i plikiem (PDF lub zdjęcie)."
      />

      <Card className="mb-5">
        <CardContent className="space-y-3 pt-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exam-date">Data badania</Label>
              <Input
                id="exam-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exam-cat">Kategoria</Label>
              <Input
                id="exam-cat"
                placeholder="np. morfologia"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exam-title">Nazwa badania</Label>
            <Input
              id="exam-title"
              placeholder="np. Panel tarczycowy TSH, FT3, FT4"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exam-desc">Krótki opis</Label>
            <Textarea
              id="exam-desc"
              rows={3}
              placeholder="Co obejmuje badanie, wyniki odbiegające od normy, zalecenia."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exam-file">Plik (PDF, zdjęcie)</Label>
            <Input
              id="exam-file"
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button
            className="w-full"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Zapisywanie…" : "Zapisz badanie"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {(exams ?? []).map((exam) => (
          <Card key={exam.id}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{plDate(exam.exam_date)}</p>
                  <p className="font-medium">{exam.title}</p>
                  <p className="text-xs text-primary">{exam.category}</p>
                </div>
                <button
                  aria-label="Usuń badanie"
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:text-destructive"
                  onClick={() => remove.mutate(exam)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {exam.description ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {exam.description}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {exam.storage_path ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => openFile(exam.storage_path!)}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Zobacz załącznik
                  </Button>
                ) : null}
                {(examFiles ?? [])
                  .filter((f) => f.exam_id === exam.id)
                  .map((f) => (
                    <span key={f.id} className="flex items-center gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => openFile(f.storage_path)}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {f.file_name ?? "Zobacz załącznik"}
                      </Button>
                      <button
                        aria-label="Usuń załącznik"
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                        onClick={() => removeFile.mutate(f)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                <label className="cursor-pointer rounded-md border border-dashed border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
                  <Paperclip className="mr-1 inline h-3.5 w-3.5" />
                  {addFiles.isPending ? "Wysyłanie…" : "Dodaj załącznik"}
                  <input
                    type="file"
                    multiple
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      e.target.value = "";
                      if (files.length) addFiles.mutate({ exam, files });
                    }}
                  />
                </label>
              </div>
            </CardContent>
          </Card>
        ))}
        {exams && exams.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Brak badań. Dodaj pierwsze powyżej lub prześlij mi dokumenty, a wpiszę je za Ciebie.
          </p>
        ) : null}
      </div>
    </>
  );
}
