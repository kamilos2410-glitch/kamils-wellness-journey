import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Logowanie – Forma" },
      { name: "description", content: "Zaloguj się do swojego dziennika zdrowia, diety i treningów." },
      { property: "og:title", content: "Logowanie – Forma" },
      { property: "og:description", content: "Zaloguj się do swojego dziennika zdrowia, diety i treningów." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { next?: string } =>
    typeof search["next"] === "string" ? { next: search["next"] as string } : {},
  component: AuthPage,
});

/** Only same-origin relative paths are allowed as a post-login redirect. */
function safeNext(next: string): string | null {
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

const schema = z.object({
  email: z.string().trim().email("Podaj poprawny adres e-mail").max(255),
  password: z.string().min(6, "Hasło musi mieć min. 6 znaków").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const target = next ? safeNext(next) : null;
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const go = () => {
      if (target) window.location.replace(target);
      else navigate({ to: "/panel", replace: true });
    };
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) go();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) go();
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, target]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Nieprawidłowe dane");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          ...parsed.data,
          options: {
            emailRedirectTo: target ? window.location.origin + target : window.location.origin,
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Sprawdź skrzynkę e-mail i potwierdź konto.");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się zalogować");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: target ? window.location.origin + target : window.location.origin,
    });
    if (result.error) {
      toast.error("Logowanie Google nie powiodło się");
      return;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{mode === "login" ? "Zaloguj się" : "Załóż konto"}</CardTitle>
          <CardDescription>Twój prywatny dziennik zdrowia, diety i treningów.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {mode === "login" ? "Zaloguj" : "Utwórz konto"}
            </Button>
          </form>

          <Button variant="outline" className="w-full" onClick={google}>
            Kontynuuj z Google
          </Button>

          <button
            type="button"
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Nie masz konta? Zarejestruj się" : "Masz już konto? Zaloguj się"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
