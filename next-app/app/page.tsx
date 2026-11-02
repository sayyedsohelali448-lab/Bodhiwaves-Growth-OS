import {
  Activity, ArrowUpRight, BriefcaseBusiness, CalendarDays, CheckCircle2,
  CircleDollarSign, ClipboardList, FolderKanban, LayoutDashboard, MessageCircle,
  Users, UserRoundCheck, Workflow
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "CRM & Sales", icon: Workflow },
  { label: "Clients", icon: BriefcaseBusiness },
  { label: "Projects", icon: FolderKanban },
  { label: "Tasks", icon: ClipboardList },
  { label: "People & HR", icon: Users },
  { label: "Attendance", icon: UserRoundCheck },
  { label: "Leave", icon: CalendarDays },
  { label: "Performance", icon: Activity },
  { label: "WhatsApp", icon: MessageCircle },
  { label: "Finance", icon: CircleDollarSign }
];

const workspaces = [
  { title: "Sales & CRM", detail: "Leads, pipeline, follow-ups and client conversion", icon: Workflow },
  { title: "Client delivery", detail: "Projects, milestones, tasks and approvals", icon: FolderKanban },
  { title: "People operations", detail: "Teams, attendance, leave and performance", icon: Users },
  { title: "Communication", detail: "WhatsApp inbox, notifications and campaigns", icon: MessageCircle }
];

function BrandMark() {
  return (
    <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
      <Activity className="size-5" strokeWidth={2.5} />
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border bg-card lg:flex lg:min-h-screen lg:flex-col">
        <div className="flex h-[76px] items-center gap-3 border-b border-border px-6">
          <BrandMark />
          <div>
            <p className="text-sm font-bold tracking-tight">Bodhiwaves</p>
            <p className="text-xs text-muted-foreground">Growth OS</p>
          </div>
        </div>
        <div className="px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
          <nav aria-label="Primary navigation" className="space-y-1">
            {navigation.map(({ label, icon: Icon, active }) => (
              <div key={label} aria-current={active ? "page" : undefined} className={active ? "flex items-center gap-3 rounded-xl bg-accent px-3 py-2.5 text-sm font-semibold text-accent-foreground" : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground"}>
                <Icon className="size-[17px]" />
                <span>{label}</span>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-auto border-t border-border p-5">
          <div className="rounded-xl bg-muted p-3">
            <p className="text-xs font-semibold">Product foundation</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Phase 0 · Design system and app shell</p>
            <Badge className="mt-3" variant="outline">Implementation preview</Badge>
          </div>
        </div>
      </aside>

      <section className="min-w-0">
        <header className="flex h-[76px] items-center justify-between border-b border-border bg-card/80 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <BrandMark />
            <div>
              <p className="text-sm font-bold">Bodhiwaves</p>
              <p className="text-xs text-muted-foreground">Growth OS</p>
            </div>
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-semibold">Workspace overview</p>
            <p className="text-xs text-muted-foreground">Your agency, in one operating system.</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Badge variant="outline" className="hidden sm:inline-flex">Phase 0 preview</Badge>
            <ThemeToggle />
            <div className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground" aria-label="Profile placeholder">BW</div>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] space-y-8 p-5 md:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-primary">Monday workspace</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Good to see you.</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">A clear view of your sales, delivery, people and client operations starts here.</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              <CalendarDays className="size-4" /> Date filters coming later
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Active clients", icon: BriefcaseBusiness },
              { label: "Open projects", icon: FolderKanban },
              { label: "Tasks in progress", icon: ClipboardList },
              { label: "Team availability", icon: Users }
            ].map(({ label, icon: Icon }) => (
              <Card key={label}>
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="mt-3 text-xl font-semibold tracking-tight">—</p>
                    <p className="mt-1 text-xs text-muted-foreground">No live data connected yet</p>
                  </div>
                  <div className="rounded-xl bg-accent p-3 text-accent-foreground"><Icon className="size-5" /></div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Workspace modules</CardTitle>
                  <CardDescription className="mt-1">The core areas that work together across your agency.</CardDescription>
                </div>
                <Badge variant="secondary">Planned structure</Badge>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {workspaces.map(({ title, detail, icon: Icon }) => (
                  <div key={title} className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div className="rounded-lg bg-accent p-2 text-accent-foreground"><Icon className="size-4" /></div>
                      <ArrowUpRight className="size-4 text-muted-foreground" />
                    </div>
                    <h3 className="mt-4 text-sm font-semibold">{title}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Getting started</CardTitle>
                <CardDescription>Foundation progress for the new application.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    "Product requirements retained",
                    "Next.js application shell created",
                    "Design tokens and theme foundation",
                    "Database and authentication setup"
                  ].map((item, index) => (
                    <div key={item} className="flex items-start gap-3">
                      {index < 3 ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> : <div className="mt-0.5 size-4 shrink-0 rounded-full border border-border" />}
                      <div>
                        <p className="text-sm font-medium">{item}</p>
                        {index === 3 && <p className="mt-1 text-xs text-muted-foreground">Scheduled for Phase 1; not part of this preview.</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-5">
            <div className="rounded-lg bg-accent p-2 text-accent-foreground"><Activity className="size-4" /></div>
            <div>
              <p className="text-sm font-semibold">No fabricated business data</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">This foundation intentionally displays empty states until real records are connected in later phases. No sample revenue, clients, employees or project counts are being presented as live data.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
