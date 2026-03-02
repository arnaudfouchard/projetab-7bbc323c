import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Users, Home, Activity, MapPin, Crosshair,
  ArrowUp, ArrowDown, Minus,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Mock data (will be replaced by real queries later)                   */
/* ------------------------------------------------------------------ */

const MOCK = {
  lat: 48.8566,
  lng: 2.3522,
  population: 850_000,
  evolution: "+2.3%",
  densite: 312,
  communes: 45,
  cantons: 12,
  accessibilite: {
    medecins: 8.2,
    pharmacies: 4.1,
    urgences_min: 12,
  },
  tranches_age_global: [
    { label: "0-14 ans", pct: 18.2 },
    { label: "15-29 ans", pct: 16.8 },
    { label: "30-44 ans", pct: 19.5 },
    { label: "45-59 ans", pct: 20.1 },
    { label: "60-74 ans", pct: 15.4 },
    { label: "75 ans et +", pct: 10.0 },
  ],
  tranches_age_hf: [
    { label: "0-14 ans", h: 9.4, f: 8.8 },
    { label: "15-29 ans", h: 8.5, f: 8.3 },
    { label: "30-44 ans", h: 9.6, f: 9.9 },
    { label: "45-59 ans", h: 9.8, f: 10.3 },
    { label: "60-74 ans", h: 7.2, f: 8.2 },
    { label: "75 ans et +", h: 3.8, f: 6.2 },
  ],
  comparaisons: [
    { indicateur: "Mortalité prématurée", territoire: 182, departement: 195, region: 190, unite: "/ 100k", rang: "up" },
    { indicateur: "Prévalence ALD", territoire: 17.2, departement: 16.8, region: 17.5, unite: "%", rang: "down" },
    { indicateur: "Densité IDE libérales", territoire: 142, departement: 155, region: 148, unite: "/ 100k", rang: "down" },
    { indicateur: "Densité MK libéraux", territoire: 98, departement: 105, region: 102, unite: "/ 100k", rang: "down" },
    { indicateur: "Densité sages-femmes", territoire: 38, departement: 42, region: 40, unite: "/ 100k", rang: "down" },
    { indicateur: "Densité médecins gén.", territoire: 86, departement: 82, region: 79, unite: "/ 100k", rang: "up" },
  ],
};

const RangIcon = ({ rang }: { rang: string }) => {
  if (rang === "up") return <ArrowUp className="h-3.5 w-3.5 text-emerald-600" />;
  if (rang === "down") return <ArrowDown className="h-3.5 w-3.5 text-destructive" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function ModuleDiagnosticTerritorial() {
  const d = MOCK;
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [showHF, setShowHF] = useState(false);

  /* ---------- Leaflet map ---------- */
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const loadMap = async () => {
      // @ts-ignore
      const L = await import("https://esm.sh/leaflet@1.9.4");

      // Inject Leaflet CSS if not present
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const map = L.map(mapRef.current!, { scrollWheelZoom: true }).setView([d.lat, d.lng], 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 18,
      }).addTo(map);

      L.marker([d.lat, d.lng]).addTo(map).bindPopup("Établissement");

      mapInstanceRef.current = map;

      // fix tiles not loading until resize
      setTimeout(() => map.invalidateSize(), 200);
    };

    loadMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const recenter = () => {
    mapInstanceRef.current?.setView([d.lat, d.lng], 11);
  };

  /* ---------- Pyramid max for scale ---------- */
  const maxPct = showHF
    ? Math.max(...d.tranches_age_hf.flatMap((t) => [t.h, t.f]))
    : Math.max(...d.tranches_age_global.map((t) => t.pct));

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Population", value: d.population.toLocaleString("fr-FR"), sub: d.evolution, icon: Users },
          { label: "Densité", value: `${d.densite} hab/km²`, sub: `${d.communes} communes`, icon: Home },
          { label: "Médecins / 10k hab", value: d.accessibilite.medecins.toString(), sub: "Densité médicale", icon: Activity },
          { label: "Urgences", value: `${d.accessibilite.urgences_min} min`, sub: "Temps d'accès moyen", icon: MapPin },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <item.icon className="h-4 w-4" />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Map + Pyramid side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Map */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm">Carte du territoire</CardTitle>
            <Button variant="outline" size="sm" onClick={recenter}>
              <Crosshair className="mr-1 h-3 w-3" />
              Recentrer
            </Button>
          </CardHeader>
          <CardContent>
            <div ref={mapRef} className="h-80 w-full rounded-lg border" />
          </CardContent>
        </Card>

        {/* Pyramid */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm">Pyramide des âges</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Global</span>
              <Switch checked={showHF} onCheckedChange={setShowHF} />
              <span className="text-xs text-muted-foreground">H / F</span>
            </div>
          </CardHeader>
          <CardContent>
            {!showHF ? (
              /* Global view — horizontal bars in primary color */
              <div className="space-y-2">
                {d.tranches_age_global.map((t) => (
                  <div key={t.label} className="flex items-center gap-3">
                    <span className="w-24 text-xs text-muted-foreground">{t.label}</span>
                    <div className="flex-1">
                      <div className="h-5 w-full rounded-full bg-secondary">
                        <div
                          className="h-5 rounded-full bg-primary/70"
                          style={{ width: `${(t.pct / maxPct) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-12 text-right text-xs font-medium">{t.pct}%</span>
                  </div>
                ))}
              </div>
            ) : (
              /* H/F view — butterfly chart */
              <div className="space-y-2">
                <div className="mb-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-3 w-3 rounded bg-blue-500/70" /> Hommes
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-3 w-3 rounded bg-pink-500/70" /> Femmes
                  </span>
                </div>
                {d.tranches_age_hf.map((t) => (
                  <div key={t.label} className="flex items-center gap-1">
                    {/* Men — right-aligned bar */}
                    <div className="flex w-[35%] justify-end">
                      <div className="flex h-5 items-center" style={{ width: `${(t.h / maxPct) * 100}%` }}>
                        <div className="h-5 w-full rounded-l-full bg-blue-500/70" />
                      </div>
                      <span className="ml-1 w-8 text-right text-[10px] font-medium">{t.h}%</span>
                    </div>
                    {/* Label */}
                    <span className="w-[20%] text-center text-xs text-muted-foreground">{t.label}</span>
                    {/* Women — left-aligned bar */}
                    <div className="flex w-[35%] items-center">
                      <span className="mr-1 w-8 text-[10px] font-medium">{t.f}%</span>
                      <div className="flex h-5 items-center" style={{ width: `${(t.f / maxPct) * 100}%` }}>
                        <div className="h-5 w-full rounded-r-full bg-pink-500/70" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparisons table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Comparaisons territoire / département / région</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Indicateur</th>
                  <th className="pb-2 text-right font-medium">Territoire</th>
                  <th className="pb-2 text-right font-medium">Département</th>
                  <th className="pb-2 text-right font-medium">Région</th>
                  <th className="pb-2 text-center font-medium">Rang</th>
                </tr>
              </thead>
              <tbody>
                {d.comparaisons.map((c) => (
                  <tr key={c.indicateur} className="border-b last:border-0">
                    <td className="py-2.5 font-medium">{c.indicateur}</td>
                    <td className="py-2.5 text-right">{c.territoire} {c.unite}</td>
                    <td className="py-2.5 text-right text-muted-foreground">{c.departement}</td>
                    <td className="py-2.5 text-right text-muted-foreground">{c.region}</td>
                    <td className="py-2.5 text-center"><RangIcon rang={c.rang} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
