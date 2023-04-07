import Debug from "debug";
import * as fs from "fs";
import * as nodePath from "path";
import { localNpmRc, REGISTRY_HOST } from "../config";
import * as EsyPackage from "./esy-package";
import * as NpmClient from "./npm-client";
import * as Npm from "./npm-session";
import { copy } from "./utils";
const Node = { path: nodePath };

const debug = Debug("bale:package:info");

function filterComments(o = {}) {
  return Object.keys(o)
    .filter((k) => !k.startsWith("//"))
    .reduce((acc, k) => {
      acc[k] = o[k];
      return acc;
    }, {});
}

export async function pack(cwd) {
  let manifest = EsyPackage.getManifest(cwd);
  let {
    name,
    version,
    description,
    override: { build, install, buildsInSource, dependencies },
  } = manifest;
  let pkgPath = await EsyPackage.fetch(cwd);
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
  return pkgPath;
}

export * from "./npm-session";

export async function createSession(): Promise<string> {
  let token: string;
  let testUsername = "foo"; // TODO centralise this
  let testEmail = "foo@bar.com"; // TODO centralise this
  let testPassword = "bar"; // TODO centralise this
  try {
    debug("Attempting npm login");
    token = await Npm.login(testUsername, testPassword);
  } catch (_) {
    debug("NPM login failed. Attempting adduser");
    token = await Npm.addUser(testUsername, testEmail, testPassword);
  }
  // // Writing to .npmrc by hand. See docs/notes.org to see why
  fs.appendFileSync(localNpmRc, `//${REGISTRY_HOST}/:_authToken="${token}"\n`);
  return token;
}
