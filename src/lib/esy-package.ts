import type { path, manifest } from "../types";
import nodePath from "path";
import * as Defaults from "./defaults";
import { mkdirpSync, download } from "./utils";
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
    source,
  } = manifest;
  let pkgPath = Defaults.pkgPath(cwd);
  mkdirpSync(pkgPath);
  await download(source, pkgPath);
  let entries = fs.readdirSync(pkgPath);
  if (entries.length > 1) {
    // Extracted tarball is not wrapped by a single root directory. The entire `pkgPath` must be considered as package root
    // pkgPath is the same
  } else {
    pkgPath = Node.path.join(pkgPath, entries[0]);
  }
  return pkgPath;
}
