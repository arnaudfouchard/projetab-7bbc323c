import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp, TrendingDown, Upload, FileSpreadsheet, X,
  ChevronDown, ChevronRight, CheckCircle2,
} from "lucide-react";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import * as XLSX from "xlsx";
import { toast } from "sonner";

const MOCK_CHARGES = {
  titre1: {
    label: "Titre 1 — Charges de personnel",
    total: 168_500_000,
    items: [
      { code: "621", label: "Personnel extérieur à l'établissement", montant: 4_200_000 },
      { code: "631/633", label: "Impôts, taxes sur rémunération", montant: 2_800_000 },
      { code: "641", label: "Rémunérations du personnel non médical", montant: 85_000_000 },
      { code: "642", label: "Rémunérations du personnel médical", montant: 52_000_000 },
      { code: "645", label: "Charges de sécurité sociale et prévoyance", montant: 18_500_000 },
      { code: "647", label: "Autres charges sociales", montant: 4_500_000 },
      { code: "648", label: "Autres charges de personnel", montant: 1_500_000 },
    ],
  },
  titre2: {
    label: "Titre 2 — Charges à caractère médical",
    total: 58_200_000,
    items: [
      { code: "601/602", label: "Achats stockés (pharma, fournitures médicales)", montant: 32_000_000 },
      { code: "606", label: "Fournitures médicales non stockées", montant: 8_500_000 },
      { code: "611", label: "Sous-traitance générale", montant: 12_000_000 },
      { code: "613/615", label: "Locations & entretiens à caractère médical", montant: 5_700_000 },
    ],
  },
  titre3: {
    label: "Titre 3 — Charges à caractère hôtelier et général",
    total: 42_800_000,
    items: [
      { code: "601/602", label: "Achats stockés hôteliers et généraux", montant: 8_200_000 },
      { code: "606", label: "Achats non stockés (hors médical)", montant: 6_500_000 },
      { code: "61/62", label: "Services extérieurs", montant: 14_300_000 },
      { code: "63", label: "Impôts et taxes (hors rémunération)", montant: 3_200_000 },
      { code: "65", label: "Autres charges de gestion courante", montant: 7_800_000 },
      { code: "653", label: "Contributions aux GHT", montant: 2_800_000 },
    ],
  },
  titre4: {
    label: "Titre 4 — Charges d'amortissements, provisions, financières et exceptionnelles",
    total: 15_500_000,
    items: [
      { code: "66", label: "Charges financières", montant: 3_200_000 },
      { code: "67", label: "Charges exceptionnelles", montant: 1_800_000 },
      { code: "68", label: "Dotations aux amortissements et provisions", montant: 10_500_000 },
    ],
  },
};

const MOCK_PRODUITS = {
  titre1: {
    label: "Titre 1 — Produits versés par l'assurance maladie",
    total: 232_000_000,
    items: [
      { code: "7311", label: "Tarification des séjours (T2A MCO)", montant: 145_000_000 },
      { code: "7311", label: "Produits médicaments & DMI en sus", montant: 22_000_000 },
      { code: "7311", label: "Forfaits et dotations annuels MCO", montant: 18_000_000 },
      { code: "7311", label: "Financement SSR", montant: 28_000_000 },
      { code: "7311", label: "DAF (Dotation annuelle de financement)", montant: 12_000_000 },
      { code: "7471", label: "FIR (Fonds d'intervention régional)", montant: 5_500_000 },
      { code: "7722", label: "Produits exercices antérieurs (AM)", montant: 1_500_000 },
    ],
  },
  titre2: {
    label: "Titre 2 — Autres produits de l'activité hospitalière",
    total: 38_500_000,
    items: [
      { code: "732", label: "Tarification non prise en charge par l'AM", montant: 18_000_000 },
      { code: "7327", label: "Forfait journalier (MCO, SSR, PSY)", montant: 12_500_000 },
      { code: "733/734", label: "Soins patients étrangers & autres étab.", montant: 4_500_000 },
      { code: "735", label: "Produits à charge État / collectivités", montant: 3_500_000 },
    ],
  },
  titre3: {
    label: "Titre 3 — Autres produits",
    total: 14_500_000,
    items: [
      { code: "70", label: "Ventes, prestations, activités annexes", montant: 3_800_000 },
      { code: "7071", label: "Rétrocession de médicaments", montant: 2_200_000 },
      { code: "74", label: "Subventions d'exploitation", montant: 1_500_000 },
      { code: "75/76", label: "Autres produits & produits financiers", montant: 1_200_000 },
      { code: "77", label: "Produits exceptionnels", montant: 800_000 },
      { code: "78", label: "Reprises sur amort., dépréc., provisions", montant: 4_000_000 },
      { code: "79", label: "Transferts de charges", montant: 1_000_000 },
    ],
  },
};

const MOCK_RATIOS = [
  { label: "Taux de marge brute", value: 3.8, ref: 3.0, unit: "%" },
  { label: "Taux d'endettement", value: 42.1, ref: 50.0, unit: "%" },
  { label: "Durée apparente de la dette", value: 4.2, ref: 5.0, unit: "ans" },
  { label: "Taux de CAF", value: 6.5, ref: 5.0, unit: "%" },
  { label: "Taux de vétusté", value: 68.2, ref: 60.0, unit: "%" },
  { label: "BFR en jours", value: 32, ref: 30, unit: "j" },
];

const MOCK_KPI = {
  chiffre_affaires: 285_000_000,
  resultat_net: 4_200_000,
  taux_marge: 1.5,
  caf: 18_500_000,
};

function formatM(n: number) {
  return `${(n / 1e6).toFixed(1)} M€`;
}

function TitreSection({
  data,
  variant,
}: {
  data: { label: string; total: number; items: { code: string; label: string; montant: number }[] };
  variant: "charges" | "produits";
}) {
  const [open, setOpen] = useState(false);
  const pct = (montant: number) => ((montant / data.total) * 100).toFixed(1);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-left transition-colors hover:bg-muted">
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <span className="text-sm font-medium">{data.label}</span>
          </div>
          <span className={`text-sm font-bold ${variant === "charges" ? "text-destructive" : "text-emerald-600"}`}>
            {formatM(data.total)}
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-6 mt-1 space-y-1 border-l-2 border-muted pl-4 pb-2">
          {data.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-muted-foreground">{item.code}</span>
                <span>{item.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{pct(item.montant)}%</span>
                <span className="font-medium tabular-nums">{formatM(item.montant)}</span>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface EprdParsed {
  sheetNames: string[];
  rowCount: number;
  sampleHeaders: string[];
}

export function ModuleDiagnosticFinancier(_props: { finessGeo?: string; codeDepartement?: string }) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [eprdParsed, setEprdParsed] = useState<EprdParsed | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const d = MOCK_KPI;

  const totalCharges = Object.values(MOCK_CHARGES).reduce((s, t) => s + t.total, 0);
  const totalProduits = Object.values(MOCK_PRODUITS).reduce((s, t) => s + t.total, 0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setEprdParsed(null);

    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array" });
      const sheetNames = wb.SheetNames;

      // Parse first sheet to get a sample
      const ws = wb.Sheets[sheetNames[0]];
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const sampleHeaders = rows.length > 0 ? Object.keys(rows[0]).slice(0, 8) : [];

      setEprdParsed({
        sheetNames,
        rowCount: rows.length,
        sampleHeaders,
      });

      toast.success(`EPRD charge : ${sheetNames.length} onglet(s), ${rows.length} lignes`);
    } catch (err: any) {
      toast.error(`Erreur lecture EPRD : ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* EPRD Upload */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Import EPRD</p>
                <p className="text-xs text-muted-foreground">
                  Importez le fichier EPRD (.xlsx) pour alimenter automatiquement les données financières
                </p>
              </div>
            </div>
            {uploadedFile ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1.5">
                  <FileSpreadsheet className="h-3 w-3" />
                  {uploadedFile.name}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setUploadedFile(null);
                    setEprdParsed(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Charger l'EPRD
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </CardContent>
      </Card>

      {/* EPRD parsed info */}
      {eprdParsed && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-800">EPRD charge avec succes</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 text-xs text-emerald-700">
              <div>
                <span className="font-medium">Onglets :</span>{" "}
                {eprdParsed.sheetNames.join(", ")}
              </div>
              <div>
                <span className="font-medium">Lignes :</span>{" "}
                {eprdParsed.rowCount.toLocaleString("fr-FR")}
              </div>
              <div>
                <span className="font-medium">Colonnes :</span>{" "}
                {eprdParsed.sampleHeaders.join(", ")}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Chiffre d'affaires", value: `${(d.chiffre_affaires / 1e6).toFixed(0)} M€` },
          { label: "Résultat net", value: `${(d.resultat_net / 1e6).toFixed(1)} M€` },
          { label: "Taux de marge", value: `${d.taux_marge}%` },
          { label: "CAF", value: `${(d.caf / 1e6).toFixed(1)} M€` },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-2xl font-bold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charges */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Charges — CRPP</CardTitle>
            <span className="text-sm font-bold text-destructive">{formatM(totalCharges)}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.values(MOCK_CHARGES).map((titre) => (
            <TitreSection key={titre.label} data={titre} variant="charges" />
          ))}
        </CardContent>
      </Card>

      {/* Produits */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Produits — CRPP</CardTitle>
            <span className="text-sm font-bold text-emerald-600">{formatM(totalProduits)}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.values(MOCK_PRODUITS).map((titre) => (
            <TitreSection key={titre.label} data={titre} variant="produits" />
          ))}
        </CardContent>
      </Card>

      {/* Ratios */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Ratios financiers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {MOCK_RATIOS.map((r) => {
              const isGood =
                r.label.includes("endettement") || r.label.includes("vétusté") || r.label.includes("BFR")
                  ? r.value <= r.ref
                  : r.value >= r.ref;
              return (
                <div key={r.label} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                  <span className="text-sm">{r.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">
                      {r.value} {r.unit}
                    </span>
                    <Badge variant={isGood ? "default" : "destructive"} className="text-xs">
                      réf. {r.ref} {r.unit}
                    </Badge>
                    {isGood ? (
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
