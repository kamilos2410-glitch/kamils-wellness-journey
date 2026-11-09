import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function resolveShareToken(token: string) {
  if (!token || token.length < 20) return null;
  const { data } = await supabaseAdmin
    .from("share_links")
    .select("id,user_id")
    .eq("token", token)
    .is("revoked_at", null)
    .maybeSingle();
  if (!data) return null;
  void supabaseAdmin
    .from("share_links")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => undefined);
  return data;
}

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const nl = (v: unknown) => esc(v).replace(/\n/g, "<br>");

function section(title: string, body: string) {
  return `<section><h2>${esc(title)}</h2>${body || "<p>Brak danych.</p>"}</section>`;
}

export async function renderShareReportText(userId: string) {
  const q = supabaseAdmin;
  const [dietPlans, workoutPlans, foodLogs, workouts, measurements, notes, exams, photos] =
    await Promise.all([
      q.from("diet_plans").select("*").eq("user_id", userId).order("start_date", { ascending: false }),
      q.from("workout_plans").select("*").eq("user_id", userId).order("start_date", { ascending: false }),
      q.from("food_logs").select("*").eq("user_id", userId).order("log_date", { ascending: false }),
      q.from("workout_sessions").select("*").eq("user_id", userId).order("session_date", { ascending: false }),
      q.from("measurements").select("*").eq("user_id", userId).order("measured_at", { ascending: false }),
      q.from("notes").select("*").eq("user_id", userId).order("note_date", { ascending: false }),
      q.from("medical_exams").select("*").eq("user_id", userId).order("exam_date", { ascending: false }),
      q.from("progress_photos").select("*").eq("user_id", userId).order("photo_date", { ascending: false }),
    ]);

  const out: string[] = [];
  const head = (t: string) => out.push("", `## ${t}`, "");

  out.push("RAPORT ZDROWIA — PEŁNE DANE", `Wygenerowano: ${new Date().toISOString()}`);

  head("Plany dietetyczne");
  for (const p of dietPlans.data ?? [])
    out.push(
      `- ${p.name} (od ${p.start_date})${p.is_active ? " [AKTYWNY]" : ""}: trening ${p.training_kcal} kcal / B ${p.training_protein} / T ${p.training_fat} / W ${p.training_carbs}; nietreningowy ${p.rest_kcal} kcal / B ${p.rest_protein} / T ${p.rest_fat} / W ${p.rest_carbs}${p.notes ? ` — ${String(p.notes).replace(/\n/g, " ")}` : ""}`,
    );

  head("Dziennik jedzenia (Fitatu)");
  for (const l of foodLogs.data ?? [])
    out.push(
      `- ${l.log_date} | trening: ${l.is_training_day ? "tak" : "nie"} | ${l.kcal} kcal | B ${l.protein} | T ${l.fat} | W ${l.carbs}`,
    );

  head("Plany treningowe");
  for (const p of workoutPlans.data ?? [])
    out.push(`- ${p.title} (od ${p.start_date})${p.is_active ? " [AKTYWNY]" : ""}`, String(p.content ?? ""), "");

  head("Sesje treningowe");
  for (const w of workouts.data ?? [])
    out.push(`- ${w.session_date} — ${w.title ?? "trening"}`, String(w.notes ?? ""), "");

  head("Pomiary");
  for (const m of measurements.data ?? [])
    out.push(`- ${m.measured_at} | ${m.metric}: ${m.value} ${m.unit}${m.notes ? ` (${m.notes})` : ""}`);

  head("Notatki");
  for (const n of notes.data ?? [])
    out.push(`- ${n.note_date} — ${n.title}`, String(n.content ?? ""), "");

  head("Badania lekarskie");
  for (const e of exams.data ?? [])
    out.push(`- ${e.exam_date} — ${e.title} [${e.category}]`, String(e.description ?? ""), "");

  head("Zdjęcia sylwetki");
  for (const p of photos.data ?? [])
    out.push(`- ${p.photo_date} | ${p.angle}${p.caption ? ` — ${p.caption}` : ""}`);

  return out.join("\n");
}

type ShareRow = Record<string, unknown>;

function withoutPrivateFields(row: ShareRow) {
  const { user_id: _userId, storage_path: _storagePath, ...publicRow } = row;
  return publicRow;
}

const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 dni

async function signedUrlMap(bucket: string, paths: string[], ttl = SIGNED_URL_TTL) {
  const map = new Map<string, string>();
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return map;
  const { data } = await supabaseAdmin.storage.from(bucket).createSignedUrls(unique, ttl);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  }
  return map;
}

export async function renderSharePhotosJson(userId: string, token: string, origin: string) {
  const { data } = await supabaseAdmin
    .from("progress_photos")
    .select("*")
    .eq("user_id", userId)
    .order("photo_date", { ascending: false })
    .order("position", { ascending: true });

  const rows = data ?? [];
  const signed = await signedUrlMap(
    "progress-photos",
    rows.map((p) => p.storage_path),
  );

  return {
    report: "Zdjęcia postępów",
    generated_at: new Date().toISOString(),
    live_data: true,
    count: rows.length,
    photos: rows.map((p) => ({
      ...withoutPrivateFields(p),
      photo_id: p.id,
      date: p.photo_date,
      angle: p.angle,
      pose: p.pose,
      order: p.position,
      preview_url: `${origin}/raport/${token}/preview/${p.id}.jpg`,
      image_url: `${origin}/raport/${token}/img/${p.id}.jpg`,
      photo_url: signed.get(p.storage_path) ?? null,
      proxy_url: `${origin}/raport/${token}/plik/progress-photos/${p.storage_path
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`,
      signed_url_expires_in_seconds: SIGNED_URL_TTL,
    })),
  };
}


export async function renderShareReportJson(userId: string, token: string, origin: string) {
  const base = `${origin}/raport/${token}`;
  const fileUrl = (bucket: string, path: string) =>
    `${base}/plik/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
  const q = supabaseAdmin;
  const [
    dietPlans,
    workoutPlans,
    foodLogs,
    workouts,
    measurements,
    notes,
    exams,
    examFiles,
    photos,
  ] = await Promise.all([
    q.from("diet_plans").select("*").eq("user_id", userId).order("start_date", { ascending: false }),
    q.from("workout_plans").select("*").eq("user_id", userId).order("start_date", { ascending: false }),
    q.from("food_logs").select("*").eq("user_id", userId).order("log_date", { ascending: false }),
    q.from("workout_sessions").select("*").eq("user_id", userId).order("session_date", { ascending: false }),
    q.from("measurements").select("*").eq("user_id", userId).order("measured_at", { ascending: false }),
    q.from("notes").select("*").eq("user_id", userId).order("note_date", { ascending: false }),
    q.from("medical_exams").select("*").eq("user_id", userId).order("exam_date", { ascending: false }),
    q.from("medical_exam_files").select("*").eq("user_id", userId),
    q.from("progress_photos").select("*").eq("user_id", userId).order("photo_date", { ascending: false }).order("position", { ascending: true }),
  ]);

  const files = examFiles.data ?? [];
  const [examSigned, photoSigned] = await Promise.all([
    signedUrlMap("medical-exams", [
      ...(exams.data ?? []).map((e) => e.storage_path).filter(Boolean as unknown as (v: unknown) => v is string),
      ...files.map((f) => f.storage_path),
    ]),
    signedUrlMap(
      "progress-photos",
      (photos.data ?? []).map((p) => p.storage_path),
    ),
  ]);

  const medicalExams = (exams.data ?? []).map((exam) => {
    const attachments = [
      ...(exam.storage_path
        ? [{
            file_name: exam.file_name ?? "załącznik",
            mime_type: exam.mime_type,
            url: examSigned.get(exam.storage_path) ?? fileUrl("medical-exams", exam.storage_path),
            proxy_url: fileUrl("medical-exams", exam.storage_path),
          }]
        : []),
      ...files
        .filter((file) => file.exam_id === exam.id)
        .map((file) => ({
          file_name: file.file_name ?? "załącznik",
          mime_type: file.mime_type,
          url: examSigned.get(file.storage_path) ?? fileUrl("medical-exams", file.storage_path),
          proxy_url: fileUrl("medical-exams", file.storage_path),
        })),
    ];
    return { ...withoutPrivateFields(exam), attachments };
  });

  const progressPhotos = (photos.data ?? []).map((photo) => ({
    ...withoutPrivateFields(photo),
    photo_id: photo.id,
    date: photo.photo_date,
    angle: photo.angle,
    pose: photo.pose,
    order: photo.position,
    preview_url: `${base}/preview/${photo.id}.jpg`,
    image_url: `${base}/img/${photo.id}.jpg`,
    photo_url: photoSigned.get(photo.storage_path) ?? fileUrl("progress-photos", photo.storage_path),
    proxy_url: fileUrl("progress-photos", photo.storage_path),
  }));

  return {
    report: "Pełny raport zdrowia",
    generated_at: new Date().toISOString(),
    live_data: true,
    photos_endpoint: `${base}/zdjecia.json`,
    instructions:
      "Dane są generowane na żywo. Otwórz ponownie ten sam adres, aby pobrać najnowszy stan. Pole photo_url to bezpośredni, podpisany link do pliku graficznego (ważny 7 dni); proxy_url działa bezterminowo dopóki link udostępniania jest aktywny.",

    data: {
      diet_plans: (dietPlans.data ?? []).map(withoutPrivateFields),
      food_logs: (foodLogs.data ?? []).map(withoutPrivateFields),
      workout_plans: (workoutPlans.data ?? []).map(withoutPrivateFields),
      workout_sessions: (workouts.data ?? []).map(withoutPrivateFields),
      measurements: (measurements.data ?? []).map(withoutPrivateFields),
      notes: (notes.data ?? []).map(withoutPrivateFields),
      medical_exams: medicalExams,
      progress_photos: progressPhotos,
    },
  };
}

export async function renderShareReport(userId: string, token: string, origin: string) {
  const base = `${origin}/raport/${token}`;
  const fileUrl = (bucket: string, path: string) =>
    `${base}/plik/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;

  const q = supabaseAdmin;
  const [
    dietPlans,
    workoutPlans,
    foodLogs,
    workouts,
    measurements,
    notes,
    exams,
    examFiles,
    photos,
  ] = await Promise.all([
    q.from("diet_plans").select("*").eq("user_id", userId).order("start_date", { ascending: false }),
    q.from("workout_plans").select("*").eq("user_id", userId).order("start_date", { ascending: false }),
    q.from("food_logs").select("*").eq("user_id", userId).order("log_date", { ascending: false }),
    q.from("workout_sessions").select("*").eq("user_id", userId).order("session_date", { ascending: false }),
    q.from("measurements").select("*").eq("user_id", userId).order("measured_at", { ascending: false }),
    q.from("notes").select("*").eq("user_id", userId).order("note_date", { ascending: false }),
    q.from("medical_exams").select("*").eq("user_id", userId).order("exam_date", { ascending: false }),
    q.from("medical_exam_files").select("*").eq("user_id", userId),
    q.from("progress_photos").select("*").eq("user_id", userId).order("photo_date", { ascending: false }),
  ]);

  const diet = (dietPlans.data ?? [])
    .map(
      (p) => `<article>
      <h3>${esc(p.name)} — od ${esc(p.start_date)}${p.is_active ? " (aktywny)" : ""}</h3>
      <p>Dzień treningowy: ${esc(p.training_kcal)} kcal, B ${esc(p.training_protein)} g, T ${esc(p.training_fat)} g, W ${esc(p.training_carbs)} g</p>
      <p>Dzień nietreningowy: ${esc(p.rest_kcal)} kcal, B ${esc(p.rest_protein)} g, T ${esc(p.rest_fat)} g, W ${esc(p.rest_carbs)} g</p>
      ${p.notes ? `<p>${nl(p.notes)}</p>` : ""}
    </article>`,
    )
    .join("");

  const logs = foodLogs.data ?? [];
  const avg = (key: "kcal" | "protein" | "fat" | "carbs") => {
    const vals = logs.map((l) => Number(l[key])).filter((v) => Number.isFinite(v));
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : "—";
  };
  const food = logs.length
    ? `<p>Średnie z ${logs.length} dni: ${avg("kcal")} kcal, B ${avg("protein")} g, T ${avg("fat")} g, W ${avg("carbs")} g</p>
      <table><thead><tr><th>Data</th><th>Trening</th><th>kcal</th><th>Białko</th><th>Tłuszcz</th><th>Węgle</th></tr></thead><tbody>${logs
        .map(
          (l) =>
            `<tr><td>${esc(l.log_date)}</td><td>${l.is_training_day ? "tak" : "nie"}</td><td>${esc(l.kcal)}</td><td>${esc(l.protein)}</td><td>${esc(l.fat)}</td><td>${esc(l.carbs)}</td></tr>`,
        )
        .join("")}</tbody></table>`
    : "";

  const plans = (workoutPlans.data ?? [])
    .map(
      (p) =>
        `<article><h3>${esc(p.title)} — od ${esc(p.start_date)}${p.is_active ? " (aktywny)" : ""}</h3><p>${nl(p.content)}</p></article>`,
    )
    .join("");

  const sessions = (workouts.data ?? [])
    .map(
      (w) =>
        `<article><h3>${esc(w.session_date)} — ${esc(w.title ?? "trening")}</h3><p>${nl(w.notes)}</p></article>`,
    )
    .join("");

  const byDate = new Map<string, string[]>();
  for (const m of measurements.data ?? []) {
    const row = `${esc(m.metric)}: ${esc(m.value)} ${esc(m.unit)}${m.notes ? ` (${esc(m.notes)})` : ""}`;
    byDate.set(m.measured_at, [...(byDate.get(m.measured_at) ?? []), row]);
  }
  const meas = [...byDate.entries()]
    .map(([date, rows]) => `<article><h3>${esc(date)}</h3><ul>${rows.map((r) => `<li>${r}</li>`).join("")}</ul></article>`)
    .join("");

  const noteHtml = (notes.data ?? [])
    .map((n) => `<article><h3>${esc(n.note_date)} — ${esc(n.title)}</h3><p>${nl(n.content)}</p></article>`)
    .join("");

  const examHtml = (exams.data ?? [])
    .map((e) => {
      const files = [
        ...(e.storage_path ? [{ storage_path: e.storage_path, file_name: e.file_name }] : []),
        ...(examFiles.data ?? []).filter((f) => f.exam_id === e.id),
      ];
      const links = files.length
        ? `<ul>${files
            .map(
              (f) =>
                `<li><a href="${fileUrl("medical-exams", f.storage_path as string)}">${esc(f.file_name ?? "załącznik")}</a></li>`,
            )
            .join("")}</ul>`
        : "<p>Brak załącznika.</p>";
      return `<article><h3>${esc(e.exam_date)} — ${esc(e.title)} [${esc(e.category)}]</h3><p>${nl(e.description)}</p>${links}</article>`;
    })
    .join("");

  const photosByDate = new Map<string, typeof photos.data>();
  for (const p of photos.data ?? []) {
    photosByDate.set(p.photo_date, [...(photosByDate.get(p.photo_date) ?? []), p] as typeof photos.data);
  }
  const photoHtml = [...photosByDate.entries()]
    .map(
      ([date, items]) =>
        `<article><h3>${esc(date)}</h3><ul>${(items ?? [])
          .map(
            (p) =>
              `<li><a href="${fileUrl("progress-photos", p.storage_path)}">${esc(p.angle)}${p.caption ? ` — ${esc(p.caption)}` : ""}</a></li>`,
          )
          .join("")}</ul></article>`,
    )
    .join("");

  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">

<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Raport zdrowia — pełne dane</title>
<meta name="description" content="Pełny raport: dieta, treningi, pomiary, notatki, badania i zdjęcia postępów.">
<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:1.5rem;line-height:1.5}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:4px 6px;font-size:14px;text-align:left}h2{margin-top:2rem;border-bottom:1px solid #ccc}article{margin-bottom:1rem}</style>
</head>
<body>
<h1>Raport zdrowia — pełne dane</h1>
<p>Wygenerowano: ${esc(new Date().toISOString())}. Dane odczytywane na żywo z aplikacji.</p>
${section("Plany dietetyczne", diet)}
${section("Dziennik jedzenia (Fitatu)", food)}
${section("Plany treningowe", plans)}
${section("Sesje treningowe", sessions)}
${section("Pomiary", meas)}
${section("Notatki", noteHtml)}
${section("Badania lekarskie", examHtml)}
${section("Zdjęcia sylwetki", photoHtml)}
</body>
</html>`;
}

export async function serveShareFile(userId: string, bucket: string, path: string) {
  if (bucket !== "medical-exams" && bucket !== "progress-photos") {
    return new Response("Not found", { status: 404 });
  }

  let owned = false;
  if (bucket === "progress-photos") {
    const { data } = await supabaseAdmin
      .from("progress_photos")
      .select("id")
      .eq("user_id", userId)
      .eq("storage_path", path)
      .maybeSingle();
    owned = !!data;
  } else {
    const [a, b] = await Promise.all([
      supabaseAdmin
        .from("medical_exams")
        .select("id")
        .eq("user_id", userId)
        .eq("storage_path", path)
        .maybeSingle(),
      supabaseAdmin
        .from("medical_exam_files")
        .select("id")
        .eq("user_id", userId)
        .eq("storage_path", path)
        .maybeSingle(),
    ]);
    owned = !!a.data || !!b.data;
  }
  if (!owned) return new Response("Not found", { status: 404 });

  const { data, error } = await supabaseAdmin.storage.from(bucket).download(path);
  if (error || !data) return new Response("Not found", { status: 404 });

  return new Response(data, {
    headers: {
      "content-type": data.type || "application/octet-stream",
      "cache-control": "public, max-age=300",
    },
  });
}

const IMAGE_CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-allow-headers": "*",
};

function guessImageType(path: string, fallback?: string) {
  if (fallback && fallback !== "application/octet-stream") return fallback;
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic") return "image/heic";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

/** Zwraca bajty zdjęcia postępów po jego id — jeden GET, bez redirectów. */
export async function servePhotoById(userId: string, photoId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(photoId)) {
    return new Response("Not found", { status: 404, headers: IMAGE_CORS });
  }
  const { data: photo } = await supabaseAdmin
    .from("progress_photos")
    .select("storage_path")
    .eq("user_id", userId)
    .eq("id", photoId)
    .maybeSingle();
  if (!photo) return new Response("Not found", { status: 404, headers: IMAGE_CORS });

  const { data, error } = await supabaseAdmin.storage
    .from("progress-photos")
    .download(photo.storage_path);
  if (error || !data) return new Response("Not found", { status: 404, headers: IMAGE_CORS });

  return new Response(data, {
    headers: {
      ...IMAGE_CORS,
      "content-type": guessImageType(photo.storage_path, data.type),
      "content-length": String(data.size),
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}

/** Mały podgląd JPEG trzymany w bazie — najszybszy i najpewniejszy kanał dla zewnętrznych klientów. */
export async function servePreviewById(userId: string, photoId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(photoId)) {
    return new Response("Not found", { status: 404, headers: IMAGE_CORS });
  }
  const { data } = await supabaseAdmin
    .from("progress_photo_previews")
    .select("preview_base64,mime_type")
    .eq("user_id", userId)
    .eq("photo_id", photoId)
    .maybeSingle();
  if (!data?.preview_base64) return servePhotoById(userId, photoId);

  const binary = atob(data.preview_base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  return new Response(bytes, {
    headers: {
      ...IMAGE_CORS,
      "content-type": data.mime_type || "image/jpeg",
      "content-length": String(bytes.byteLength),
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}

/** Lekki manifest zdjęć: photo_id, date, angle, image_url (bezpośredni plik .jpg). */
export async function renderPhotoManifest(userId: string, token: string, origin: string) {
  const { data } = await supabaseAdmin
    .from("progress_photos")
    .select("id,photo_date,angle,pose,position,caption,storage_path")
    .eq("user_id", userId)
    .order("photo_date", { ascending: false })
    .order("position", { ascending: true });

  const rows = data ?? [];
  const signed = await signedUrlMap(
    "progress-photos",
    rows.map((p) => p.storage_path),
  );

  return {
    report: "Manifest zdjęć sylwetki",
    generated_at: new Date().toISOString(),
    live_data: true,
    count: rows.length,
    note: "preview_url to mały JPEG (~720 px) generowany z bazy — najszybszy i najpewniejszy kanał. image_url to pełny plik obrazu (jeden GET, image/*, CORS *). signed_url to alternatywny link do storage ważny 7 dni.",
    photos: rows.map((p) => ({
      photo_id: p.id,
      date: p.photo_date,
      angle: p.angle,
      pose: p.pose,
      order: p.position,
      caption: p.caption,
      preview_url: `${origin}/raport/${token}/preview/${p.id}.jpg`,
      image_url: `${origin}/raport/${token}/img/${p.id}.jpg`,
      alt_image_url: `${origin}/api/public/raport/${token}/photo/${p.id}.jpg`,
      signed_url: signed.get(p.storage_path) ?? null,
    })),
  };
}

/* ============================================================
   Podział raportu na mniejsze, szybkie endpointy sekcyjne
   ============================================================ */

export const SHARE_CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, HEAD, OPTIONS",
  "access-control-allow-headers": "*",
} as const;

export const SHARE_JSON_HEADERS = {
  ...SHARE_CORS,
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=60, s-maxage=60",
} as const;

type SectionDef = { table: string; orderBy: string; label: string };

export const SHARE_SECTIONS: Record<string, SectionDef> = {
  "dieta": { table: "diet_plans", orderBy: "start_date", label: "Plany dietetyczne" },
  "jedzenie": { table: "food_logs", orderBy: "log_date", label: "Dziennik jedzenia (Fitatu)" },
  "plany-treningowe": { table: "workout_plans", orderBy: "start_date", label: "Plany treningowe" },
  "treningi": { table: "workout_sessions", orderBy: "session_date", label: "Sesje treningowe" },
  "pomiary": { table: "measurements", orderBy: "measured_at", label: "Pomiary" },
  "notatki": { table: "notes", orderBy: "note_date", label: "Notatki" },
  "badania": { table: "medical_exams", orderBy: "exam_date", label: "Badania lekarskie" },
};

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;

type LooseQuery = {
  select: (cols: string, opts?: { count?: "exact"; head?: boolean }) => LooseQuery;
  eq: (col: string, val: unknown) => LooseQuery;
  order: (col: string, opts: { ascending: boolean }) => LooseQuery;
  range: (from: number, to: number) => LooseQuery;
  then: <T>(cb: (r: { data: ShareRow[] | null; count: number | null }) => T) => Promise<T>;
};
const db = supabaseAdmin as unknown as { from: (table: string) => LooseQuery };

async function countRows(table: string, userId: string) {
  const { count } = await db.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId);
  return count ?? 0;
}

/** Jedna sekcja danych z paginacją — mała, szybka odpowiedź. */
export async function renderShareSection(
  userId: string,
  name: string,
  token: string,
  origin: string,
  opts: { limit?: number | undefined; offset?: number | undefined } = {},
) {
  const def = SHARE_SECTIONS[name];
  if (!def) return null;

  const limit = Math.min(Math.max(opts.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(opts.offset ?? 0, 0);
  const base = `${origin}/raport/${token}`;

  const [total, { data }] = await Promise.all([
    countRows(def.table, userId),
    db
      .from(def.table)
      .select("*")
      .eq("user_id", userId)
      .order(def.orderBy, { ascending: false })
      .range(offset, offset + limit - 1),
  ]);

  const rows = (data ?? []) as ShareRow[];
  let items: ShareRow[] = rows.map(withoutPrivateFields);

  if (name === "badania") {
    const fileUrl = (path: string) =>
      `${base}/plik/medical-exams/${path.split("/").map(encodeURIComponent).join("/")}`;
    const { data: fileRows } = await db
      .from("medical_exam_files")
      .select("*")
      .eq("user_id", userId);
    const files = (fileRows ?? []) as ShareRow[];
    items = rows.map((exam) => ({
      ...withoutPrivateFields(exam),
      attachments: [
        ...(exam["storage_path"]
          ? [
              {
                file_name: exam["file_name"] ?? "załącznik",
                mime_type: exam["mime_type"],
                url: fileUrl(exam["storage_path"] as string),
              },
            ]
          : []),
        ...files
          .filter((f) => f["exam_id"] === exam["id"])
          .map((f) => ({
            file_name: f["file_name"] ?? "załącznik",
            mime_type: f["mime_type"],
            url: fileUrl(f["storage_path"] as string),
          })),

      ],
    }));
  }


  const nextOffset = offset + items.length;
  return {
    report: def.label,
    section: name,
    generated_at: new Date().toISOString(),
    live_data: true,
    total,
    offset,
    limit,
    count: items.length,
    next_url: nextOffset < total ? `${base}/sekcja/${name}.json?offset=${nextOffset}&limit=${limit}` : null,
    index_url: `${base}/dane.json`,
    items,
  };
}

/** Lekki indeks: liczniki + stabilne linki do wszystkich sekcji. */
export async function renderShareIndex(userId: string, token: string, origin: string) {
  const base = `${origin}/raport/${token}`;
  const names = Object.keys(SHARE_SECTIONS);
  const counts = await Promise.all(names.map((n) => countRows(SHARE_SECTIONS[n]!.table, userId)));
  const photoCount = await countRows("progress_photos", userId);

  const sections = names.map((n, i) => ({
    section: n,
    label: SHARE_SECTIONS[n]!.label,
    count: counts[i],
    url: `${base}/sekcja/${n}.json`,
  }));

  return {
    report: "Indeks raportu zdrowia",
    generated_at: new Date().toISOString(),
    live_data: true,
    instructions:
      "Dane są generowane na żywo. Pobierz kolejne sekcje z listy `sections` (każda mała i szybka). Sekcje mają paginację przez ?offset= i ?limit= oraz pole next_url. Pełny raport w jednej odpowiedzi (duży): dodaj ?full=1 do tego adresu.",
    endpoints: {
      index: `${base}/dane.json`,
      full: `${base}/dane.json?full=1`,
      photos: `${base}/zdjecia.json`,
      photo_manifest: `${base}/manifest.json`,
      text: `${base}/raport.txt`,
      html: base,
      photo_preview_pattern: `${base}/preview/{photo_id}.jpg`,
      photo_image_pattern: `${base}/img/{photo_id}.jpg`,
      file_pattern: `${base}/plik/{bucket}/{storage_path}`,
    },
    sections: [
      ...sections,
      { section: "zdjecia", label: "Zdjęcia sylwetki", count: photoCount, url: `${base}/zdjecia.json` },
    ],
  };
}
