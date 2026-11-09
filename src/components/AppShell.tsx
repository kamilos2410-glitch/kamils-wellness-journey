import { Link, useRouter, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Apple,
  UtensilsCrossed,
  Dumbbell,
  LineChart,
  Camera,
  StickyNote,
  FlaskConical,
  Settings,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const nav = [
  { to: "/panel", label: "Panel", icon: LayoutDashboard },
  { to: "/dieta", label: "Dieta", icon: Apple },
  { to: "/jedzenie", label: "Fitatu", icon: UtensilsCrossed },
  { to: "/treningi", label: "Treningi", icon: Dumbbell },
  { to: "/pomiary", label: "Pomiary", icon: LineChart },
  { to: "/zdjecia", label: "Zdjęcia", icon: Camera },
  { to: "/notatki", label: "Notatki", icon: StickyNote },
  { to: "/badania", label: "Badania", icon: FlaskConical },
] as const;


export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background pb-36 sm:pb-24">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/panel" className="text-sm font-semibold tracking-tight">
            Forma<span className="text-primary">.</span>
          </Link>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Ustawienia"
                  className="flex items-center rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link to="/import" className="cursor-pointer">
                    Import danych
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/udostepnianie" className="cursor-pointer">
                    Dostęp dla ChatGPT
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" /> Wyloguj
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-4 gap-1 px-2 py-2 sm:grid-cols-8">
          {nav.map((item) => {
            const active = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] leading-tight transition-colors",
                  active
                    ? "bg-secondary text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}
