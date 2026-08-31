import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { MappingFields } from "@/components/mapping-fields";
import { datasetsQuery, profilesQuery, saveProfile } from "@/lib/scout-api";
import { emptyIdMap, type IdMap, type Metric } from "@/lib/scout-types";

export const Route = createFileRoute("/mapear")({
  head: () => ({
    meta: [
      { title: "Perfis de posição — Scout Board" },
      {
        name: "description",
        content:
          "Configure, por tipo de jogador, quais colunas da planilha são identificação e quais são as 14 avaliações que aparecem na ficha.",
      },
      { property: "og:title", content: "Perfis de posição — Scout Board" },
      {
        property: "og:description",
        content: "Ajuste as 14 avaliações e os rótulos de cada tipo de jogador.",
      },
    ],
  }),
  component: MapearPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="mx-auto max-w-5xl px-4 py-16 text-sm text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Perfil não encontrado.</div>,
});

function MapearPage() {
  const queryClient = useQueryClient();
  const profiles = useQuery(profilesQuery);
  const datasets = useQuery(datasetsQuery);
  const [selected, setSelected] = useState<string | null>(null);
  const [idMap, setIdMap] = useState<IdMap>(emptyIdMap);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [saving, setSaving] = useState(false);

  const profile = (profiles.data ?? []).find((p) => p.player_type === selected) ?? null;

  const columns = useMemo(() => {
    if (!profile) return [];
    const cols = new Set<string>();
    for (const d of datasets.data ?? []) {
      if (d.player_type === profile.player_type) d.columns.forEach((c) => cols.add(c));
    }
    if (!cols.size) {
      Object.values(profile.id_map).forEach((c) => c && cols.add(c));
      profile.metrics.forEach((m) => cols.add(m.column));
    }
    return Array.from(cols);
  }, [profile, datasets.data]);

  function select(type: string) {
    const p = (profiles.data ?? []).find((x) => x.player_type === type);
    setSelected(type);
    setIdMap(p ? { ...emptyIdMap, ...p.id_map } : emptyIdMap);
    setMetrics(p?.metrics ?? []);
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      await saveProfile({
        player_type: selected,
        id_map: idMap,
        metrics: metrics.filter((m) => m.column).map((m) => ({ ...m, label: m.label || m.column })),
      });
      await queryClient.invalidateQueries();
      toast.success("Perfil salvo. As fichas já usam o novo mapeamento.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold sm:text-3xl">Perfis de posição</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Cada tipo de jogador tem seu próprio conjunto de 14 avaliações. Ajuste aqui os rótulos, troque
        colunas e marque as métricas em que o menor valor é o melhor.
      </p>

      {(profiles.data ?? []).length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Nenhum perfil ainda — ele é criado na primeira importação de planilha.
        </p>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2">
          {(profiles.data ?? []).map((p) => (
            <Button
              key={p.id}
              variant={selected === p.player_type ? "default" : "secondary"}
              size="sm"
              onClick={() => select(p.player_type)}
            >
              {p.player_type}
              <span className="ml-2 text-xs opacity-70">{p.metrics.length}/14</span>
            </Button>
          ))}
        </div>
      )}

      {profile && (
        <div className="mt-8 rounded-xl border border-border/70 bg-card p-5">
          <MappingFields
            columns={columns}
            idMap={idMap}
            metrics={metrics}
            onIdMapChange={setIdMap}
            onMetricsChange={setMetrics}
          />
          <div className="mt-6">
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Salvando…" : "Salvar perfil"}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
