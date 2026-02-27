import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  MapPin, TrendingUp, Activity, GitMerge,
  Target, CalendarDays, Search, ArrowLeft, Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MODULES } from "@/lib/constants";
import type { ModuleId } from "@/lib/types";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MapPin, TrendingUp, Activity, GitMerge, Target, CalendarDays, Search,
};

export default function SelectModules() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode = params.get("mode") || "project";
  const entityName = decodeURIComponent(params.get("name") || "");
  const finess = params.get("finess") || "";

  const [selectedModules, setSelectedModules] = useState<ModuleId[]>([]);

  const isExploration = mode === "exploration";

  const toggle = (id: ModuleId) => {
    if (isExploration) {
      setSelectedModules([id]);
    } else {
      setSelectedModules((prev) =>
        prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
      );
    }
  };

  const handleCreate = () => {
    // In real app, POST to API then navigate to workspace
    navigate(`/projects/p1`);
  };

  return (
    <div className="container max-w-3xl py-10">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="mb-6 text-muted-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Retour
      </Button>

      <div className="mb-2 animate-fade-in">
        <h1 className="font-display text-2xl font-bold">Sélection des modules</h1>
        <p className="mt-1 text-muted-foreground">
          {entityName && (
            <span className="font-medium text-foreground">{entityName}</span>
          )}
          {entityName && " — "}
          {isExploration
            ? "Choisissez un module à explorer"
            : "Sélectionnez les modules à inclure (minimum 1)"}
        </p>
      </div>

      <div className="my-8 grid gap-3 sm:grid-cols-2">
        {MODULES.map((mod, i) => {
          const Icon = iconMap[mod.icon] || MapPin;
          const isActive = selectedModules.includes(mod.id);
          return (
            <Card
              key={mod.id}
              className={`card-hover cursor-pointer animate-fade-in transition-all ${
                isActive ? "border-accent ring-2 ring-accent/20" : ""
              }`}
              style={{ animationDelay: `${i * 50}ms` }}
              onClick={() => toggle(mod.id)}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    isActive ? "gold-gradient text-accent-foreground" : "bg-secondary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">{mod.label}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{mod.description}</p>
                </div>
                {isActive && <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Retour
        </Button>
        <Button disabled={selectedModules.length === 0} onClick={handleCreate}>
          {isExploration ? "Explorer" : "Créer le projet"}
        </Button>
      </div>
    </div>
  );
}
