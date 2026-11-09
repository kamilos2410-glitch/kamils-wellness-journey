import { auth, defineMcp } from "@lovable.dev/mcp-js";
import type { McpDefinitionInput } from "@lovable.dev/mcp-js";
import getHealthOverview from "./tools/get-health-overview";
import listPlans from "./tools/list-plans";
import listFoodLogs from "./tools/list-food-logs";
import listMeasurements from "./tools/list-measurements";
import listNotes from "./tools/list-notes";
import listProgressPhotos from "./tools/list-progress-photos";
import listMedicalExams from "./tools/list-medical-exams";
import addNote from "./tools/add-note";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "my-health-hub",
  title: "My Health Hub",
  version: "0.1.0",
  instructions:
    "Dziennik zdrowia, diety i treningu jednego użytkownika. Użyj get_health_overview do pełnego obrazu, list_food_logs do dziennych kalorii z Fitatu, list_plans do celów makro i planu treningowego, list_measurements do wagi i obwodów, list_notes do notatek, list_progress_photos do zdjęć sylwetki (zwraca podpisane linki do obrazów), list_medical_exams do wyników badań lekarskich wraz z linkami do plików. add_note zapisuje wnioski z analizy w aplikacji.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: ([
    getHealthOverview,
    listPlans,
    listFoodLogs,
    listMeasurements,
    listNotes,
    listProgressPhotos,
    listMedicalExams,
    addNote,
  ] as unknown) as McpDefinitionInput["tools"],
});
