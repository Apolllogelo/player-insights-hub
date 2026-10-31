import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { Route as IndexRouteImport } from "./routes/index";
import { Route as JogadoresRouteImport } from "./routes/jogadores";
import { Route as MapearRouteImport } from "./routes/mapear";
import { Route as PlanejadorRouteImport } from "./routes/planejador";
import { Route as JogadorIdRouteImport } from "./routes/jogador.$id";

const IndexRoute = IndexRouteImport.update({
  id: "/",
  path: "/",
  getParentRoute: () => routeTree,
} as any);
const JogadoresRoute = JogadoresRouteImport.update({
  id: "/jogadores",
  path: "/jogadores",
  getParentRoute: () => routeTree,
} as any);
const MapearRoute = MapearRouteImport.update({
  id: "/mapear",
  path: "/mapear",
  getParentRoute: () => routeTree,
} as any);
const PlanejadorRoute = PlanejadorRouteImport.update({
  id: "/planejador",
  path: "/planejador",
  getParentRoute: () => routeTree,
} as any);
const JogadorIdRoute = JogadorIdRouteImport.update({
  id: "/jogador/$id",
  path: "/jogador/$id",
  getParentRoute: () => routeTree,
} as any);

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree: routeTree
      ._addFileChildren({
        IndexRoute,
        JogadoresRoute,
        MapearRoute,
        PlanejadorRoute,
        JogadorIdRoute,
      } as any)
      ._addFileTypes<any>(),
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
