import type { path, manifest } from "../types";
import * as fs from "fs-extra";
import nodePath from "path";
import * as NpmServer from "../lib/npm-server";
import * as Defaults from "./defaults";
import { mkdirpSync, download, copy, filterComments } from "./utils";
import * as Log from "../logger";
import { REGISTRY_ADDR, REGISTRY_PORT, REGISTRY_URL } from "../config";

import * as cp from "child_process";
import Debug from "debug";
import * as Npm from "./npm-session";
import * as NpmClient from "./npm-client";
import { REGISTRY_HOST, localNpmRc } from "../config";
import * as EsyPackage from "./esy-package";

const debug = Debug("esy-package:package");

const Node = {
  path: nodePath,
};

export async function pack(cwd) {
  let manifest = EsyPackage.getManifest(cwd);
  let {
    name,
    version,
    override: { build, install, buildsInSource, dependencies },
  } = manifest;
  let pkgPath = await EsyPackage.fetch(cwd);
  fs.writeFileSync(
    Node.path.join(pkgPath, ".npmignore"),
    `
_esy
`
  );
  await NpmClient.pack(pkgPath);
  let packageTarGzPath = Node.path.join(cwd, "package.tar.gz");
  debug("Package tarball path that will be published", packageTarGzPath);
  fs.renameSync(
    Node.path.join(pkgPath, `${name}-${version}.tgz`),
    packageTarGzPath
  );
}

export * from "./npm-session";

export async function createSession(server): Promise<string> {
  let token: string;
  let testUsername = "foo"; // TODO centralise this
  let testEmail = "foo@bar.com"; // TODO centralise this
  let testPassword = "bar"; // TODO centralise this
  let { host: registryHost } = server;
  try {
    debug("Attempting npm login");
    token = await Npm.login(testUsername, testPassword);
  } catch (_) {
    debug("NPM login failed. Attempting adduser");
    token = await Npm.addUser(testUsername, testEmail, testPassword);
  }
  // // Writing to .npmrc by hand. See docs/notes.org to see why
  fs.appendFileSync(localNpmRc, `//${registryHost}/:_authToken="${token}"\n`);
  return token;
}
export async function packAndPublish(
  pack: string,
  cwd: path,
  storagePath: path = Defaults.storagePath
) {
  Log.info("Setting up");
  await withVerdaccioRunning(storagePath, (server) => {
    Log.info("Verdaccio registry started");
    Log.info("Setting up verdaccio user session");
    await Bale.createSession(server);
    Log.info("Packaging");
    if (pack) {
      pack
        .split("&&")
        .map((s) => s.trim())
        .forEach((command) => {
          cp.execSync(command);
        });
    } else {
      await Bale.pack(cwd);
    }
    let tarballPath = `${cwd}/package.tar.gz`;
    Log.process(
      "verdaccio",
      await NpmClient.publish(REGISTRY_URL, tarballPath)
    );
    return 0;
  });
}

export async function withVerdaccioRunning(
  storagePath: path,
  f: any
): Promise<any> {
  Log.info("Clearing storage path meant for verdaccio", storagePath);
  await fs.remove(storagePath);
  fs.mkdirp(storagePath);
  let server: any;
  Log.info("Initialising verdaccio server");
  server = await NpmServer.init(
    "/unnecessary-path.yml",
    storagePath,
    REGISTRY_ADDR,
    REGISTRY_PORT
  );
  await NpmServer.start(server);
  await f(server);
  NpmServer.stop(server);
}

export function getManifest(cwd: path): manifest {
  return require(Node.path.join(cwd, "esy.json"));
}

export async function fetch(cwd: path): Promise<path> {
  let manifest = getManifest(cwd);
  let {
    name,
    version,
    description,
    source,
    override: { build, install, buildsInSource, dependencies },
  } = manifest;
  if (!source || source === "") {
    throw new Error("Empty source field");
  }
  let pkgPath = Defaults.pkgPath(cwd);
  mkdirpSync(pkgPath);
  await download(source, pkgPath);
  let entries = fs.readdirSync(pkgPath);
  if (entries.length > 1) {
    // Extracted tarball is not wrapped by a single root directory. The entire
    // `pkgPath` must be considered as package root
  } else {
    pkgPath = Node.path.join(pkgPath, entries[0]);
  }

  // Preparing for esy development and/or npm packing
  let buildEnv = filterComments(manifest.override.buildEnv);
  let exportedEnv = filterComments(manifest.override.exportedEnv);
  let esy = { buildsInSource, build, install, buildEnv, exportedEnv };
  let patchFilesPath = Node.path.join(cwd, "files");
  if (fs.existsSync(patchFilesPath)) {
    copy(patchFilesPath, pkgPath);
  }
  fs.writeFileSync(
    Node.path.join(pkgPath, "package.json"),
    JSON.stringify({ name, version, description, esy, dependencies }, null, 2)
  );

  return pkgPath;
}

export async function buildShell(cwd: path): Promise<void> {}
