/** Agrupa as colunas originais da planilha em blocos temáticos para leitura mais fácil. */

type GroupDef = { name: string; test: RegExp };

const GROUPS: GroupDef[] = [
  {
    name: "Identificação e contrato",
    test: /nome|clube|time|idade|nascim|nacional|pa[ií]s|altura|peso|p[eé]|posi[cç]|contrato|sal[aá]rio|valor|pre[cç]o|cl[aá]usula/i,
  },
  {
    name: "Participação",
    test: /jogo|partida|minuto|titular|banco|convoc|entrad|nota|m[eé]dia|rating/i,
  },
  {
    name: "Finalização e criação",
    test: /gol|chut|finaliz|xg|assist|cruzam|passe|chave|toque|drible|conclu/i,
  },
  {
    name: "Defesa e duelos",
    test: /desarm|intercept|cort|bloqu|duel|divid|desafi|recuper|marca|carrinho|afast/i,
  },
  {
    name: "Goleiro",
    test: /defesa|gol\s*sofr|p[eê]nal|salvament|saved|xgp|clean/i,
  },
  {
    name: "Físico",
    test: /dist[aâ]ncia|sprint|velocid|corrid|km|resist|press/i,
  },
  {
    name: "Disciplina",
    test: /cart[aã]o|amarel|vermelh|falta|impedim|erro|perda/i,
  },
];

export type ColumnGroup = { name: string; items: [string, unknown][] };

export function groupEntries(entries: [string, unknown][]): ColumnGroup[] {
  const buckets = new Map<string, [string, unknown][]>();
  const push = (name: string, entry: [string, unknown]) => {
    const list = buckets.get(name) ?? [];
    list.push(entry);
    buckets.set(name, list);
  };

  for (const entry of entries) {
    const group = GROUPS.find((g) => g.test.test(entry[0]));
    push(group?.name ?? "Outros dados", entry);
  }

  const order = [...GROUPS.map((g) => g.name), "Outros dados"];
  return order
    .filter((name) => buckets.has(name))
    .map((name) => ({ name, items: buckets.get(name)! }));
}
