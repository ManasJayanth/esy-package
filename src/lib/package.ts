const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const url = require("url");
const cp = require("child_process");
import { download } from "./utils";
import * as EsyPackage from "./esy-package";
import type { path as $path } from "../types";

async function copy(src: string, dest: string) {
  let srcStat = fs.statSync(src);
  if (srcStat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      await fs.mkdirp(dest);
    }
    let srcEntries = fs.readdirSync(src);
    for (let srcEntry of srcEntries) {
      await copy(path.join(src, srcEntry), path.join(dest, srcEntry));
    }
  } else {
    fs.writeFileSync(dest, fs.readFileSync(src));
  }
}

export async function pkg(cwd: $path) {
  let manifest = require(path.join(cwd, "esy.json"));
  let {
    source,
    name,
    version,
    description,
    override: { build, install, buildsInSource, dependencies },
  } = manifest;
  let esyPackageDir = path.join(cwd, "_esy-package");
  await fs.mkdirp(esyPackageDir);
  let pkgPath = esyPackageDir;
  return EsyPackage.fetch(cwd).then(async (pkgPath) => {
    function filterComments(o = {}) {
      return Object.keys(o)
        .filter((k) => !k.startsWith("//"))
        .reduce((acc, k) => {
          acc[k] = o[k];
          return acc;
        }, {});
    }
    let buildEnv = filterComments(manifest.override.buildEnv);
    let exportedEnv = filterComments(manifest.override.exportedEnv);
    let esy = { buildsInSource, build, install, buildEnv, exportedEnv };
    let patchFilesPath = path.join(cwd, "files");
    if (fs.existsSync(patchFilesPath)) {
      await copy(patchFilesPath, pkgPath);
    }
    fs.writeFileSync(
      path.join(pkgPath, "package.json"),
      JSON.stringify({ name, version, description, esy, dependencies }, null, 2)
    );
    fs.writeFileSync(
      path.join(pkgPath, ".npmignore"),
      `
_esy
`
    );
  });
}
