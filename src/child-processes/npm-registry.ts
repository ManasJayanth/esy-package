import type { server as serverT } from "../types";
import * as NpmServer from "../lib/npm-server";

let server: serverT;

async function main(): Promise<void> {
  // server = await NpmServer.init();
  // await NpmServer.start(server);
}

async function cleanup(server: serverT): Promise<void> {
  // NpmServer.stop(server);
}

// process.on("uncaughtException", () => cleanup(server));
// main();
