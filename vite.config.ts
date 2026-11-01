import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "path";
import tanstackRouter from "@tanstack/router-plugin/vite";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    publicDir: "public",
    plugins: [
      tanstackRouter({
        routeTreeGen: {
          routeTreeFile: "./src/routeTree.gen.ts",
        },
      }),
    ],
  },
});
