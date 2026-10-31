import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { Route as IndexRouteImport } from "./routes/index";

const IndexRoute = IndexRouteImport.update({
  id: "/",
  path: "/",
  getParentRoute: () => routeTree,
} as any);

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree: routeTree
      ._addFileChildren({ IndexRoute } as any)
      ._addFileTypes<any>(),
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
