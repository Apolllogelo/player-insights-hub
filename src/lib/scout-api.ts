import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Dataset, IdMap, Metric, PlayerRow, PositionProfile } from "./scout-types";

export const datasetsQuery = queryOptions({
  queryKey: ["datasets"],
  queryFn: async (): Promise<Dataset[]> => {
    const { data, error } = await supabase
      .from("datasets")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((d) => ({
      ...d,
      columns: (d.columns as string[] | null) ?? [],
    })) as Dataset[];
  },
});

export const profilesQuery = queryOptions({
  queryKey: ["position_profiles"],
  queryFn: async (): Promise<PositionProfile[]> => {
    const { data, error } = await supabase
      .from("position_profiles")
      .select("*")
      .order("player_type");
    if (error) throw error;
    return (data ?? []).map((p) => ({
      ...p,
      id_map: p.id_map as IdMap,
      metrics: (p.metrics as Metric[] | null) ?? [],
    })) as PositionProfile[];
  },
});

export const playersQuery = queryOptions({
  queryKey: ["players"],
  queryFn: async (): Promise<PlayerRow[]> => {
    const { data, error } = await supabase.from("players").select("*").order("name");
    if (error) throw error;
    return (data ?? []) as PlayerRow[];
  },
});

export function playerQuery(id: string) {
  return queryOptions({
    queryKey: ["player", id],
    queryFn: async (): Promise<PlayerRow | null> => {
      const { data, error } = await supabase.from("players").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return (data as PlayerRow | null) ?? null;
    },
  });
}

export function datasetPlayersQuery(datasetId: string) {
  return queryOptions({
    queryKey: ["dataset-players", datasetId],
    queryFn: async (): Promise<PlayerRow[]> => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("dataset_id", datasetId);
      if (error) throw error;
      return (data ?? []) as PlayerRow[];
    },
  });
}

export async function saveProfile(input: {
  player_type: string;
  id_map: IdMap;
  metrics: Metric[];
}) {
  const { data, error } = await supabase
    .from("position_profiles")
    .upsert(
      {
        player_type: input.player_type,
        id_map: input.id_map as never,
        metrics: input.metrics as never,
      },
      { onConflict: "player_type" },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function importDataset(input: {
  name: string;
  player_type: string;
  columns: string[];
  rows: Record<string, unknown>[];
  id_map: IdMap;
  metrics: Metric[];
}) {
  await saveProfile({
    player_type: input.player_type,
    id_map: input.id_map,
    metrics: input.metrics,
  });

  const { data: dataset, error: datasetError } = await supabase
    .from("datasets")
    .insert({
      name: input.name,
      player_type: input.player_type,
      row_count: input.rows.length,
      columns: input.columns as never,
    })
    .select()
    .single();
  if (datasetError) throw datasetError;

  const { toNumber } = await import("./scout-types");

  // Best-effort: try to add the uid column via server function (works in Lovable Cloud)
  try {
    const { ensurePlayersUidColumn } = await import("./migrations.server");
    await ensurePlayersUidColumn();
  } catch {
    // Ignore — column-existence check below handles the fallback
  }

  // Check whether the `uid` column exists so we don't send it if it's missing
  const { error: uidCheckError } = await supabase.from("players").select("uid").limit(0);
  const hasUidColumn = !uidCheckError;

  const payload = input.rows.map((row) => ({
    dataset_id: dataset.id,
    player_type: input.player_type,
    name: String(row[input.id_map.name] ?? "Sem nome"),
    club: input.id_map.club ? String(row[input.id_map.club] ?? "") || null : null,
    age: input.id_map.age ? toNumber(row[input.id_map.age]) : null,
    ...(hasUidColumn && input.id_map.uid
      ? { uid: String(row[input.id_map.uid] ?? "") || null }
      : {}),
    position: null,
    minutes: null,
    data: row as never,
  }));

  for (let i = 0; i < payload.length; i += 200) {
    const { error } = await supabase.from("players").insert(payload.slice(i, i + 200));
    if (error) throw error;
  }

  return dataset;
}

export async function deleteDataset(id: string) {
  const { error } = await supabase.from("datasets").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteProfile(id: string) {
  const { error } = await supabase.from("position_profiles").delete().eq("id", id);
  if (error) throw error;
}

/** Apaga todos os jogadores e planilhas importadas (mantém os perfis de posição). */
export async function resetPlayers() {
  const players = await supabase.from("players").delete().not("id", "is", null);
  if (players.error) throw players.error;
  const datasets = await supabase.from("datasets").delete().not("id", "is", null);
  if (datasets.error) throw datasets.error;
}
