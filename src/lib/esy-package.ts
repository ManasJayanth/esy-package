import type { path, manifest } from "../types";
import nodePath from "path";
import * as Defaults from "./defaults";
import { mkdirpSync, download } from "./utils";
import * as fs from "fs-extra";

const Node = {
  path: nodePath,
};

export function getManifest(cwd: path): manifest {
  return require(Node.path.join(cwd, "esy.json"));
}

export async function fetch(cwd: path): Promise<path> {
  let manifest = getManifest(cwd);
  let { source } = manifest;
  if (!source || source === "") {
    throw new Error("Empty source field");
  }
  let pkgPath = Defaults.pkgPath(cwd);
  mkdirpSync(pkgPath);
  let downloadedPath = await download(source, pkgPath);
  let entries = await fs.readdir(pkgPath);
  if (entries.length > 1) {
    // Extracted tarball is not wrapped by a single root directory. The entire `pkgPath` must be considered as package root
    // pkgPath is the same
    entries = entries.filter((e) =>
      fs.statSync(nodePath.join(pkgPath, e)).isDirectory()
    );
    pkgPath = Node.path.join(pkgPath, entries[0]);
  } else if (entries.length === 1) {
    pkgPath = Node.path.join(pkgPath, entries[0]);
  } else {
    throw new Error("Empty pkgPath: TODO better message");
  }
  return nodePath.relative(cwd, pkgPath);
}
