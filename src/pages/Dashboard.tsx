import { useNavigate } from "react-router-dom";
import { Plus, Compass, FolderOpen, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { MOCK_PROJECTS } from "@/lib/mock-data";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const actions = [
  {
    title: "Nouveau projet",
    description: "Créer un projet d'établissement avec entité et modules",
    icon: Plus,
    href: "/projects/select-entity?mode=project",
    accent: true,
  },
  {
    title: "Mode exploration",
    description: "Explorer un module sans sauvegarder de projet",
    icon: Compass,
    href: "/projects/select-entity?mode=exploration",
    accent: false,
  },
  {
    title: "Explorer la base",
    description: "Rechercher dans les documents, entretiens et diagnostics",
    icon: FolderOpen,
    href: "/projects/select-entity?mode=exploration",
    accent: false,
  },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="container max-w-6xl py-10">
      {/* Hero */}
      <div className="mb-10 animate-fade-in">
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Tableau de bord
        </h1>
        <p className="mt-2 text-muted-foreground">
          Automatisez la production de vos projets médicaux d'établissement
        </p>
      </div>

      {/* Action cards */}
      <div className="mb-12 grid gap-4 sm:grid-cols-3">
        {actions.map((a, i) => (
          <Card
            key={a.title}
            className={`card-hover cursor-pointer ${
              a.accent ? "border-accent/40 bg-accent/5" : ""
            }`}
            style={{ animationDelay: `${i * 80}ms` }}
            onClick={() => navigate(a.href)}
          >
            <CardContent className="flex flex-col gap-3 p-6">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  a.accent ? "gold-gradient text-accent-foreground" : "bg-secondary"
                }`}
              >
                <a.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">{a.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Existing projects */}
      <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Projets existants</h2>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            Voir tout <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        {MOCK_PROJECTS.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <FolderOpen className="mb-3 h-10 w-10 opacity-40" />
              <p>Aucun projet pour le moment</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => navigate("/projects/select-entity?mode=project")}
              >
                <Plus className="mr-1 h-4 w-4" /> Créer un projet
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MOCK_PROJECTS.map((project) => (
              <Card
                key={project.id}
                className="card-hover cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-semibold leading-tight">
                      {project.name}
                    </CardTitle>
                    <StatusBadge status={project.status} />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded bg-secondary px-1.5 py-0.5 font-medium">
                      {project.type}
                    </span>
                    <span>•</span>
                    <span>{project.region}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(project.updated_at), "d MMM yyyy", { locale: fr })}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {project.modules.length} module{project.modules.length > 1 ? "s" : ""}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
