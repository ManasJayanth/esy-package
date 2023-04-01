import type { path } from "../types";
import Path from "path";
import startVerdaccio from "verdaccio";

export function init(
  configPath: path,
  storagePath: path,
  addr: string,
  port: number
) {
  let config = {
    storage: storagePath,
    self_path: configPath,
    auth: {
      htpasswd: { file: Path.join(__dirname, "htpasswd") },
    },
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
  };
  const cache = Path.join(__dirname, "cache");

  return new Promise(function (resolve, reject) {
    startVerdaccio(
      config,
      `${port}`,
      cache,
      "1.0.0",
      "verdaccio",
      (webServer, addrs, pkgName, pkgVersion) => {
        resolve({ server: webServer, addrs, pkgName, pkgVersion });
      }
    );
  });
}

export function start(args: any): Promise<void> {
  let { server, addrs } = args;
  return new Promise((resolve, reject) => {
    try {
      server.unref();
      server.listen(addrs.port || addrs.path, addrs.host, () => {
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

export function stop(args) {
  let { server } = args;
  server.close();
}
