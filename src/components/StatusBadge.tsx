import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: "draft" | "in_progress" | "completed";
}

const config = {
  draft: { label: "Brouillon", className: "bg-secondary text-secondary-foreground" },
  in_progress: { label: "En cours", className: "bg-info/15 text-info border-info/30" },
  completed: { label: "Terminé", className: "bg-success/15 text-success border-success/30" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const c = config[status];
  return (
    <Badge variant="outline" className={c.className}>
      {c.label}
    </Badge>
  );
}
