import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, AlertTriangle, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MappingFields } from "@/components/mapping-fields";
import { datasetsQuery, profilesQuery, saveProfile, deleteProfile } from "@/lib/scout-api";
import { emptyIdMap, type IdMap, type Metric } from "@/lib/scout-types";

export const Route = createFileRoute("/mapear")({
  head: () => ({
    meta: [
      { title: "Perfis de posição — Scout Board" },
      {
        name: "description",
        content:
          "Configure ou exclua, por tipo de jogador, quais colunas da planilha são identificação e quais são as 14 avaliações que aparecem na ficha.",
      },
      { property: "og:title", content: "Perfis de posição — Scout Board" },
      {
        property: "og:description",
        content: "Ajuste, adicione ou exclua as 14 avaliações e os rótulos de cada tipo de jogador.",
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
  const [deleting, setDeleting] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<{ id: string; player_type: string } | null>(null);

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

  async function handleDeleteConfirm() {
    if (!profileToDelete) return;
    setDeleting(true);
    try {
      await deleteProfile(profileToDelete.id);
      await queryClient.invalidateQueries();
      if (selected === profileToDelete.player_type) {
        setSelected(null);
      }
      toast.success(`Perfil "${profileToDelete.player_type}" excluído com sucesso.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir perfil.");
    } finally {
      setDeleting(false);
      setProfileToDelete(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Perfis de posição</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Cada tipo de jogador tem seu próprio conjunto de 14 avaliações. Ajuste aqui os rótulos, troque
            colunas, marque as métricas inversas ou exclua perfis que não utiliza mais.
          </p>
        </div>
      </div>

      {(profiles.data ?? []).length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">
          Nenhum perfil cadastrado ainda — ele é criado na primeira importação de planilha.
        </p>
      ) : (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {(profiles.data ?? []).map((p) => {
            const isSelected = selected === p.player_type;
            return (
              <div key={p.id} className="inline-flex items-center rounded-lg border border-border/70 bg-card p-1">
                <Button
                  variant={isSelected ? "default" : "ghost"}
                  size="sm"
                  onClick={() => select(p.player_type)}
                  className="h-8 text-xs font-medium"
                >
                  {p.player_type}
                  <span className="ml-2 text-[10px] opacity-75">{p.metrics.length}/14</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProfileToDelete({ id: p.id, player_type: p.player_type });
                  }}
                  className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title={`Excluir perfil ${p.player_type}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {profile && (
        <div className="mt-8 rounded-xl border border-border/70 bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Editando Perfil: <span className="text-primary">{profile.player_type}</span>
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ajuste os campos de identificação e as 14 métricas deste tipo de jogador
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setProfileToDelete({ id: profile.id, player_type: profile.player_type })}
              className="h-8 border-destructive/30 text-xs text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Excluir este perfil
            </Button>
          </div>

          <div className="mt-5">
            <MappingFields
              columns={columns}
              idMap={idMap}
              metrics={metrics}
              onIdMapChange={setIdMap}
              onMetricsChange={setMetrics}
            />
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? "Salvando…" : "Salvar alterações"}
            </Button>
          </div>
        </div>
      )}

      {/* DIÁLOGO DE CONFIRMAÇÃO PARA EXCLUIR PERFIL */}
      <AlertDialog open={!!profileToDelete} onOpenChange={(open) => !open && setProfileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <AlertDialogTitle>Excluir Perfil de Posição?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2 text-sm">
              Tem certeza que deseja excluir o perfil{" "}
              <strong className="text-foreground">"{profileToDelete?.player_type}"</strong>?
              <br />
              <br />
              Todas as 14 avaliações e mapeamentos configurados para este perfil serão apagados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteConfirm()}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo…" : "Sim, excluir perfil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

