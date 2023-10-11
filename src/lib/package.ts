const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const url = require("url");
const cp = require("child_process");
import { download } from "./utils";
import * as NpmClient from "./npm-client";
import * as EsyPackage from "./esy-package";
import type { path as $path } from "../types";
import Debug from "debug";
const debug = Debug("bale:package:info");

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
    esy: esyConfig,
    version,
    description,
    override: { build, install, buildsInSource, dependencies },
    resolutions,
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
    let esy = Object.assign(
      {},
      { buildsInSource, build, install, buildEnv, exportedEnv },
      esyConfig
    );
    let patchFilesPath = path.join(cwd, "files");
    if (fs.existsSync(patchFilesPath)) {
      await copy(patchFilesPath, pkgPath);
    }
    fs.writeFileSync(
      path.join(pkgPath, "package.json"),
      JSON.stringify(
        { name, version, description, esy, dependencies, resolutions },
        null,
        2
      )
    );
    fs.writeFileSync(
      path.join(pkgPath, ".npmignore"),
      `
_esy
`
    );
    await NpmClient.pack(pkgPath);
    let packageTarGzPath = path.join(cwd, "package.tar.gz");
    debug("Package tarball path that can be published", packageTarGzPath);
    fs.renameSync(
      path.join(pkgPath, `${name}-${version}.tgz`),
      packageTarGzPath
    );
    return { pkgPath, packageTarGzPath };
  });
}
