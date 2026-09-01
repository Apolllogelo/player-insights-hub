import { formatValue } from "./scout-types";

/** Agrupa as colunas originais da planilha em blocos temáticos inteligentes para scouting no futebol. */

export type GroupDef = {
  id: string;
  name: string;
  icon: string;
  description: string;
  test: RegExp;
};

export const SCOUT_GROUPS: GroupDef[] = [
  {
    id: "id_contract",
    name: "Identificação e Contrato",
    icon: "UserCheck",
    description: "Dados cadastrais, clube, características físicas e contrato",
    test: /(nome|player|atleta|jogador|clube|club|team|time|equipe|squad|idade|age|nascim|birth|nacional|nat|pa[ií]s|country|altura|height|peso|weight|p[eé]|foot|posi[cç]|pos|contrato|contract|sal[aá]rio|salary|wage|valor|pre[cç]o|cl[aá]usula|market|fee|agent|agente)/i,
  },
  {
    id: "participation",
    name: "Participação e Tempo",
    icon: "Clock",
    description: "Jogos, titularidade, minutos jogados e avaliações gerais",
    test: /(jogo|match|partida|app|minuto|min|titular|start|banco|sub|convoc|entrad|nota|m[eé]dia|rating|sofascore|fotmob|whoscored|90s|completo)/i,
  },
  {
    id: "finishing",
    name: "Finalização e Ataque",
    icon: "Target",
    description: "Gols, finalizações, xG e efetividade ofensiva",
    test: /(gol|goal|chut|shot|finaliz|xg|npxg|alvo|target|convers|cabece|header|p[eê]nalti|penalty|penalti|ofensiv|ataque)/i,
  },
  {
    id: "creation",
    name: "Criação e Passes",
    icon: "GitBranch",
    description: "Assistências, xA, passes decisivos, cruzamentos e visão",
    test: /(assist|xa|passe|pass|chave|key|cruzam|cross|lan[cç]am|long\s*ball|bola\s*longa|profund|progressiv|terceir|infiltr|toque|touch|criat|chance)/i,
  },
  {
    id: "dribble_carry",
    name: "Condução e Dribles",
    icon: "Footprints",
    description: "Dribles, progressões com bola e duelos ofensivos",
    test: /(dribl|take.?on|condu[cç]|carr|progress[aã]o|progression|1v1|um\s*contra\s*um|toque.*[aá]rea|perda.*posse|dispossess|turnover|turn\s*over)/i,
  },
  {
    id: "defense",
    name: "Defesa e Duelos",
    icon: "Shield",
    description: "Desarmes, interceptações, disputas e bolas recuperadas",
    test: /(desarm|tackl|intercept|cort|clear|bloqu|block|duel|divid|desafi|recuper|recover|marca|carrinho|afast|press|defens|disput)/i,
  },
  {
    id: "goalkeeper",
    name: "Goleiro",
    icon: "HandMetal",
    description: "Defesas, gols sofridos, clean sheets e ações de área",
    test: /(goleiro|keeper|gk|defesa|gol\s*sofr|conceded|p[eê]nal.*defend|salvament|saved|xgp|psxg|clean\s*sheet|jogo.*sem.*sofr|sa[ií]da.*gol|cruzamento.*segur)/i,
  },
  {
    id: "physical",
    name: "Físico e Intensidade",
    icon: "Zap",
    description: "Distância percorrida, sprints, velocidade e resistência",
    test: /(dist[aâ]ncia|dist|sprint|velocid|speed|corrid|km|resist|press[aã]o|acelera|desacelera|intensid|work\s*rate|f[ií]sic)/i,
  },
  {
    id: "discipline",
    name: "Disciplina e Faltas",
    icon: "AlertOctagon",
    description: "Cartões, faltas cometidas/sofridas, pênaltis e erros",
    test: /(cart[aã]o|card|amarel|yellow|vermelh|red|falta|foul|impedim|offside|erro|error|mistake)/i,
  },
];

export type ColumnGroup = {
  id: string;
  name: string;
  icon: string;
  description: string;
  items: [string, unknown][];
};

export type GroupingMode = "categories" | "alphabetical" | "with_values";

export type ColumnUnit =
  | "none"
  | "percent"
  | "minutes"
  | "years"
  | "cm"
  | "currency"
  | "per90"
  | "matches"
  | "goals"
  | "passes";

export const UNIT_OPTIONS: { id: ColumnUnit; label: string; suffix: string; prefix?: string }[] = [
  { id: "none", label: "Padrão (sem unidade)", suffix: "" },
  { id: "percent", label: "Porcentagem (%)", suffix: "%" },
  { id: "minutes", label: "Minutos (min)", suffix: " min" },
  { id: "years", label: "Idade / Anos", suffix: " anos" },
  { id: "cm", label: "Altura (cm)", suffix: " cm" },
  { id: "currency", label: "Moeda (R$)", suffix: "", prefix: "R$ " },
  { id: "per90", label: "Por 90 min (/90)", suffix: " /90" },
  { id: "matches", label: "Jogos / Partidas", suffix: " jogos" },
  { id: "goals", label: "Gols", suffix: " gols" },
  { id: "passes", label: "Passes", suffix: " passes" },
];

export function autoDetectUnit(columnName: string): ColumnUnit {
  const c = columnName.toLowerCase();
  if (/%|taxa|aproveit|precis[aã]o|acerto|pct|convers/i.test(c)) return "percent";
  if (/minuto|tempo.*jogado|min/i.test(c)) return "minutes";
  if (/idade|age|nascim/i.test(c)) return "years";
  if (/altura|height/i.test(c)) return "cm";
  if (/sal[aá]rio|salary|wage|valor|pre[cç]o|cl[aá]usula/i.test(c)) return "currency";
  if (/\/90|por.*90|per.*90/i.test(c)) return "per90";
  if (/jogo.*completo|partida|match|app/i.test(c)) return "matches";
  if (/gol|goal/i.test(c)) return "goals";
  return "none";
}

export function formatColumnValue(value: unknown, unit: ColumnUnit = "none"): string {
  const formatted = formatValue(value);
  if (formatted === "—" || formatted === "") return "—";

  const opt = UNIT_OPTIONS.find((u) => u.id === unit);
  if (!opt || unit === "none") return formatted;

  if (opt.prefix) {
    return `${opt.prefix}${formatted}${opt.suffix}`;
  }
  return `${formatted}${opt.suffix}`;
}

export function groupEntries(
  entries: [string, unknown][],
  mode: GroupingMode = "categories",
  customGroupMap?: Record<string, string>,
  customItemOrder?: Record<string, string[]>,
): ColumnGroup[] {
  if (mode === "alphabetical") {
    const sorted = [...entries].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
    return [
      {
        id: "all_alphabetical",
        name: "Todas as Colunas (A-Z)",
        icon: "ListFilter",
        description: "Listagem ordenada alfabeticamente",
        items: sorted,
      },
    ];
  }

  if (mode === "with_values") {
    const filled = entries.filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "" && String(v).trim() !== "—");
    return [
      {
        id: "only_filled",
        name: "Apenas com Valores Preenchidos",
        icon: "CheckCircle2",
        description: "Colunas que contêm dados para este jogador",
        items: filled,
      },
    ];
  }

  const buckets = new Map<string, [string, unknown][]>();
  const push = (groupId: string, entry: [string, unknown]) => {
    const list = buckets.get(groupId) ?? [];
    list.push(entry);
    buckets.set(groupId, list);
  };

  for (const entry of entries) {
    const colName = entry[0];
    // Se o usuário moveu manualmente esta coluna para outro grupo, respeita a escolha
    const customGroupId = customGroupMap?.[colName];
    if (customGroupId) {
      push(customGroupId, entry);
    } else {
      const group = SCOUT_GROUPS.find((g) => g.test.test(colName));
      push(group?.id ?? "others", entry);
    }
  }

  const result: ColumnGroup[] = [];

  for (const g of SCOUT_GROUPS) {
    let items = buckets.get(g.id);
    if (items && items.length > 0) {
      // Se houver ordenação customizada dentro do grupo, reordena
      const order = customItemOrder?.[g.id];
      if (order && order.length > 0) {
        const itemMap = new Map(items.map((it) => [it[0], it]));
        const orderedItems: [string, unknown][] = [];
        for (const colName of order) {
          if (itemMap.has(colName)) {
            orderedItems.push(itemMap.get(colName)!);
            itemMap.delete(colName);
          }
        }
        // Itens que não estavam na ordem salva vão ao final
        for (const it of itemMap.values()) {
          orderedItems.push(it);
        }
        items = orderedItems;
      }

      result.push({
        id: g.id,
        name: g.name,
        icon: g.icon,
        description: g.description,
        items,
      });
    }
  }

  let otherItems = buckets.get("others");
  if (otherItems && otherItems.length > 0) {
    const order = customItemOrder?.["others"];
    if (order && order.length > 0) {
      const itemMap = new Map(otherItems.map((it) => [it[0], it]));
      const orderedItems: [string, unknown][] = [];
      for (const colName of order) {
        if (itemMap.has(colName)) {
          orderedItems.push(itemMap.get(colName)!);
          itemMap.delete(colName);
        }
      }
      for (const it of itemMap.values()) {
        orderedItems.push(it);
      }
      otherItems = orderedItems;
    }

    result.push({
      id: "others",
      name: "Outros Dados e Métricas",
      icon: "FileSpreadsheet",
      description: "Colunas complementares da planilha original",
      items: otherItems,
    });
  }

  return result;
}

