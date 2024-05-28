import type { path } from "../types";
import * as rimraf from "rimraf";
import Path from "path";
import { runServer } from "verdaccio";
import { REGISTRY_PORT } from "../config";
import Debug from "debug";
import fse from "fs-extra";

export let REGISTRY_ADDR = "localhost";
const debug = Debug("bale:npm-server:info");
export type $Server = { port: number; addr: string; server: any };

async function init(
  testPackageName: string,
  configPath: path,
  storagePath: path,
  addr: string,
  port: number,
): Promise<$Server> {
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

export function getUrl({ port, addr }) {
  const registryHost = `${addr}:${port}`;
  return `http://${registryHost}`;
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

export async function setup(storagePath: path, manifest: any) {
  debug("Clearing storage path meant for verdaccio", storagePath);
  rimraf.sync(storagePath);
  fse.mkdirp(storagePath);
  debug("Initialising verdaccio server");
  const server: any = await init(
    manifest.name,
    "/unnecessary-path.yml",
    storagePath,
    REGISTRY_ADDR,
    REGISTRY_PORT,
  );
  debug("Setting up verdaccio user session");
  await start(server);
  return server;
}
