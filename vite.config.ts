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
      {
        name: "faces-static",
        configureServer(server) {
          server.middlewares.use("/faces", (req, res, next) => {
            // Serve files from the FM26 faces folder
            const facesDir = path.resolve(
              "C:/Users/angel/OneDrive/Documentos/Sports Interactive/Football Manager 26/graphics/faces/faces",
            );
            const url = req.url ?? "/";
            const filePath = path.join(facesDir, url.split("?")[0] ?? "");
            res.setHeader("Access-Control-Allow-Origin", "*");
            // Use send from vite's internal serve-static or fs
            import("fs").then(({ existsSync, createReadStream, statSync }) => {
              if (existsSync(filePath) && statSync(filePath).isFile()) {
                res.setHeader("Content-Type", "image/png");
                createReadStream(filePath).pipe(res);
              } else {
                next();
              }
            });
          });
        },
      },
    ],
  },
});
