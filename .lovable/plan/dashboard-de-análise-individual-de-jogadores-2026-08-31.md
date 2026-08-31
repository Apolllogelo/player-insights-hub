# Dashboard de Análise Individual de Jogadores

Objetivo: transformar planilhas com 100+ colunas em uma ficha individual limpa, onde as 14 avaliações que importam para cada tipo de jogador aparecem em destaque — e nada passa batido.

## Como vai funcionar

1. **Upload** — você sobe o CSV ou Excel (uma planilha por tipo de jogador, ex: goleiro, zagueiro, meia, atacante).
2. **Mapeamento** — o app lê todos os cabeçalhos e você escolhe, uma vez só, quais colunas correspondem a:
  - identificação (nome, clube, idade, posição, minutos jogados)
  - as 14 avaliações daquele tipo de jogador
   Esse mapeamento fica salvo como um "perfil de posição" e é reutilizado nos próximos uploads do mesmo tipo.
3. **Ficha individual** — tela principal, limpa:
  - cabeçalho com nome, clube, idade, posição, minutos
  - radar com as 14 avaliações (percentil dentro do grupo da mesma posição)
  - as 14 avaliações em cartões com valor, percentil e barra
  - bloco **Destaques e Alertas**: pontos fortes (percentil alto) e pontos de atenção (percentil baixo) calculados automaticamente — é isso que evita algo passar batido
  - acesso a todas as 100+ colunas em uma seção recolhida "Dados completos", para consulta sem poluir a tela
4. **Navegação** — lista lateral/superior com busca e filtro por posição, clube e idade para pular de jogador em jogador.

## Estrutura de telas

- `/` — Upload + lista de jogadores (busca e filtros)
- `/mapear` — configuração dos perfis de posição e das 14 avaliações
- `/jogador/$id` — ficha individual

## Dados

Uso do Lovable Cloud para que uploads, perfis de posição e jogadores fiquem salvos entre sessões:

- `datasets` — arquivo enviado, tipo de jogador, data
- `position_profiles` — tipo de jogador + mapeamento das colunas e das 14 avaliações
- `players` — linhas da planilha (identificação + todas as colunas originais em JSON)

Percentis são calculados no app comparando o jogador com os demais da mesma posição no mesmo dataset.

## Detalhes técnicos

- Parse de CSV e XLSX no cliente (papaparse + xlsx), gravação em lote no Cloud.
- Percentil por métrica calculado sobre o conjunto da posição; suporte a métricas onde "menor é melhor" (marcador invertido no mapeamento).
- Radar e barras com Recharts; layout com tokens semânticos do design system.
- Rotas TanStack com `head()` próprio por página.

## Fora deste escopo (posso adicionar depois)

- Comparação lado a lado e scatter de contratações
- Ranking/shortlist com score composto
- Score ponderado configurável por posição