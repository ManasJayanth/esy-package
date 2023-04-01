import type { path } from "../types";
import { runServer } from "verdaccio";

export function init(
  configPath: path,
  storagePath: path,
  addr: string,
  port: number
) {
  return runServer({
    storage: storagePath,
    self_path: configPath,
    logs: { type: "stdout", format: "pretty", level: "http" },
    listen: { "": `${addr}:${port}` },
    packages: {
      "@*/*": {
        access: "$anonymous",
        publish: "$anonymous",
        unpublish: "$anonymous",
      },
      "**": {
        access: "$anonymous",
        publish: "$anonymous",
        unpublish: "$anonymous",
      },
    },
    max_body_size: "1000mb",
  });
}

export function start(server: any) {
  return new Promise((resolve) => {
    server.listen(resolve);
  });
}

export function stop(server: any) {
  server.close();
}
