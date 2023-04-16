import type { path, manifest } from "../types";
import nodePath from "path";
import * as Defaults from "./defaults";
import { mkdirpSync, download, copy, filterComments } from "./utils";
import * as fs from "fs";

const Node = {
  path: nodePath
};

export function getManifest(cwd: path): manifest {
  return require(Node.path.join(cwd, "esy.json"));
}

export async function fetch(cwd: path ): Promise<path> {
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
