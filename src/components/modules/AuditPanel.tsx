import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Loader2,
  RefreshCw, Link2, Unlink2, Database, Clock, Download,
} from "lucide-react";
import { toast } from "sonner";

interface AuditResult {
  total_etablissements: number;
  total_ghts: number;
  total_certifications: number;
  total_sae: number;
  total_communes_pop: number;
  total_ald_dept: number;
  total_ald_national: number;
  etab_with_ght: number;
  etab_orphan_ght: number;
  etab_with_certification: number;
  certif_orphan_finess: number;
  etab_with_sae: number;
  sae_orphan_finess: number;
  dept_etab_sans_population: number;
  dept_avec_population: number;
  dept_avec_ald: number;
  dept_ald_sans_population: number;
  pct_etab_certif: number;
  pct_etab_sae: number;
  pct_etab_ght: number;
  derniere_certif_annee: number | null;
  derniere_sae_annee: number | null;
  derniere_pop_annee: number | null;
  derniere_ald_annee: number | null;
  audit_timestamp: string;
}

interface ImportHistoryRow {
  id: string;
  source_id: string;
  version_label: string;
  record_count: number;
  records_inserted: number;
  records_updated: number;
  records_deleted: number;
  orphan_keys_detected: number;
  status: string;
  started_at: string;
  completed_at: string | null;
}

interface AuditResponse {
  audit: AuditResult;
  import_history: ImportHistoryRow[];
  data_sources: any[];
  linkage_overrides_count: number;
}

function CoverageBar({ pct, label }: { pct: number; label: string }) {
  const color =
    pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-yellow-500" : "bg-destructive";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

function LinkageRow({
  label,
  ok,
  orphans,
  total,
}: {
  label: string;
  ok: number;
  orphans: number;
  total: number;
}) {
  const isClean = orphans === 0;
  return (
    <TableRow>
      <TableCell className="font-medium text-sm">{label}</TableCell>
      <TableCell className="text-right text-sm">{total.toLocaleString("fr-FR")}</TableCell>
      <TableCell className="text-right text-sm">
        <span className="flex items-center justify-end gap-1.5">
          <Link2 className="h-3 w-3 text-emerald-500" />
          {ok.toLocaleString("fr-FR")}
        </span>
      </TableCell>
      <TableCell className="text-right text-sm">
        {isClean ? (
          <span className="flex items-center justify-end gap-1.5 text-emerald-600">
            <CheckCircle2 className="h-3 w-3" /> 0
          </span>
        ) : (
          <span className="flex items-center justify-end gap-1.5 text-destructive">
            <Unlink2 className="h-3 w-3" /> {orphans.toLocaleString("fr-FR")}
          </span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={isClean ? "secondary" : "destructive"} className="text-xs">
          {isClean ? "OK" : "Orphelins"}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "success") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (status === "failed") return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  if (status === "audit_warning") return <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />;
  return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
}

export function AuditPanel() {
  const queryClient = useQueryClient();

  // Fetch audit via RPC directly (no edge function needed for basic audit)
  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ["audit-linkages"],
    queryFn: () => api.get<AuditResult>("/audit"),
  });

  // Fetch import history
  const { data: importHistory = [] } = useQuery({
    queryKey: ["import-history"],
    queryFn: () => api.get<ImportHistoryRow[]>("/import-history"),
  });

  // Fetch linkage overrides count
  const { data: overridesCount = 0 } = useQuery({
    queryKey: ["linkage-overrides-count"],
    queryFn: async () => {
      const data = await api.get<{ count: number }>("/linkage-overrides/count");
      return data.count || 0;
    },
  });

  // Refresh audit
  const refreshAudit = useMutation({
    mutationFn: async () => {
      const data = await api.post("/audit/run");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-linkages"] });
      queryClient.invalidateQueries({ queryKey: ["import-history"] });
      toast.success("Audit terminé");
    },
    onError: (err: any) => {
      toast.error(`Erreur audit : ${err.message}`);
    },
  });

  const exportAudit = () => {
    if (!auditData) return;
    const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (auditLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  const a = auditData;

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <h2 className="font-display text-lg font-bold">Audit des liaisons</h2>
          {a?.audit_timestamp && (
            <Badge variant="outline" className="text-xs font-normal">
              <Clock className="mr-1 h-3 w-3" />
              {new Date(a.audit_timestamp).toLocaleString("fr-FR")}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportAudit}
            disabled={!auditData}
          >
            <Download className="mr-1 h-3.5 w-3.5" /> Export JSON
          </Button>
          <Button
            size="sm"
            onClick={() => refreshAudit.mutate()}
            disabled={refreshAudit.isPending}
          >
            {refreshAudit.isPending ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
            )}
            Lancer l'audit
          </Button>
        </div>
      </div>

      {!a ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Database className="mx-auto mb-3 h-8 w-8" />
            <p>Aucun audit disponible. Cliquez sur "Lancer l'audit" pour commencer.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{a.total_etablissements.toLocaleString("fr-FR")}</p>
                <p className="text-xs text-muted-foreground">Etablissements</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{a.total_ghts}</p>
                <p className="text-xs text-muted-foreground">GHT</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{a.total_communes_pop.toLocaleString("fr-FR")}</p>
                <p className="text-xs text-muted-foreground">Communes (pop.)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{overridesCount}</p>
                <p className="text-xs text-muted-foreground">Corrections manuelles</p>
              </CardContent>
            </Card>
          </div>

          {/* Taux de couverture */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Taux de couverture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CoverageBar pct={a.pct_etab_certif ?? 0} label="Etablissements avec certification HAS" />
              <CoverageBar pct={a.pct_etab_sae ?? 0} label="Etablissements avec SAE (capacites)" />
              <CoverageBar pct={a.pct_etab_ght ?? 0} label="Etablissements rattaches a un GHT" />
              <CoverageBar
                pct={
                  a.dept_avec_population > 0
                    ? Math.round(
                        ((a.dept_avec_population - a.dept_etab_sans_population) /
                          a.dept_avec_population) *
                          100
                      )
                    : 0
                }
                label="Departements avec donnees population"
              />
              <CoverageBar
                pct={
                  a.dept_avec_ald > 0
                    ? Math.round(
                        ((a.dept_avec_ald - a.dept_ald_sans_population) / a.dept_avec_ald) * 100
                      )
                    : 0
                }
                label="Departements ALD avec population"
              />
            </CardContent>
          </Card>

          {/* Matrice de liaisons */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Matrice des liaisons</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Liaison</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Lies</TableHead>
                    <TableHead className="text-right">Orphelins</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <LinkageRow
                    label="Certification HAS → Etablissements"
                    total={a.total_certifications}
                    ok={a.total_certifications - a.certif_orphan_finess}
                    orphans={a.certif_orphan_finess}
                  />
                  <LinkageRow
                    label="SAE Capacites → Etablissements"
                    total={a.total_sae}
                    ok={a.total_sae - a.sae_orphan_finess}
                    orphans={a.sae_orphan_finess}
                  />
                  <LinkageRow
                    label="Etablissements → GHT"
                    total={a.etab_with_ght}
                    ok={a.etab_with_ght - a.etab_orphan_ght}
                    orphans={a.etab_orphan_ght}
                  />
                  <LinkageRow
                    label="Depts. etablissements → Population"
                    total={a.dept_avec_population + a.dept_etab_sans_population}
                    ok={a.dept_avec_population}
                    orphans={a.dept_etab_sans_population}
                  />
                  <LinkageRow
                    label="Depts. ALD → Population"
                    total={a.dept_avec_ald}
                    ok={a.dept_avec_ald - a.dept_ald_sans_population}
                    orphans={a.dept_ald_sans_population}
                  />
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Fraicheur des donnees */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Fraicheur des donnees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { label: "Certification HAS", year: a.derniere_certif_annee },
                  { label: "SAE Capacites", year: a.derniere_sae_annee },
                  { label: "Population INSEE", year: a.derniere_pop_annee },
                  { label: "ALD departement", year: a.derniere_ald_annee },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-lg font-bold">
                      {item.year ?? <span className="text-muted-foreground">—</span>}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Import history */}
          {importHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Historique des imports</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead className="text-right">Enregistrements</TableHead>
                      <TableHead className="text-right">Inseres</TableHead>
                      <TableHead className="text-right">MAJ</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importHistory
                      .filter((h) => h.source_id !== "_audit")
                      .map((h) => (
                        <TableRow key={h.id}>
                          <TableCell className="font-medium text-sm">{h.source_id}</TableCell>
                          <TableCell className="text-sm">{h.version_label}</TableCell>
                          <TableCell className="text-right text-sm">
                            {(h.record_count || 0).toLocaleString("fr-FR")}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {(h.records_inserted || 0).toLocaleString("fr-FR")}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {(h.records_updated || 0).toLocaleString("fr-FR")}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(h.started_at).toLocaleDateString("fr-FR")}
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1.5">
                              <StatusIcon status={h.status} />
                              <span className="text-xs">{h.status}</span>
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
