import type { path } from "../types";
import Path from "path";
import { runServer } from "verdaccio";

export async function init(
  testPackageName: string,
  configPath: path,
  storagePath: path,
  addr: string,
  port: number,
) {
  let config = {
    storage: storagePath,
    self_path: configPath,
    listen: `${addr}:${port}`,
    auth: {
      htpasswd: { file: Path.join(__dirname, "htpasswd") },
    },
    logs: { type: "stdout", format: "json", level: "http" },
    uplinks: {
      npmjs: {
        url: "https://registry.npmjs.org/",
      },
    },
    packages: {
      [testPackageName]: {
        access: "$anonymous",
        publish: "$all",
        unpublish: "$anonymous",
        proxy: [],
      },
      "@*/*": {
        access: "$anonymous",
        publish: "$all",
        unpublish: "$anonymous",
        proxy: ["npmjs"],
      },
      "**": {
        access: "$anonymous",
        publish: "$all",
        unpublish: "$anonymous",
        proxy: ["npmjs"],
      },
    },
    max_body_size: "1000mb",
  };

  // @ts-ignore
  let server = await runServer(config);
  return { port, addr, server };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function start(args: any): Promise<void> {
  let { port, addr, server } = args;
  return new Promise((resolve, reject) => {
    // @ts-nocheck
    server.listen(port, addr, (event) => {
      delay(2500).then(resolve);
    });
  });
}

export function stop(args) {
  let { server } = args;
  server.close();
}
