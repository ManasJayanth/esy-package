import * as cp from "child_process";
import * as fs from "fs";
import * as crypto from "crypto";
import * as Npm from "./npm-session";
import * as NpmClient from "./npm-client";
import Path from "path";
import Os from "os";
import fse from "fs-extra";
import * as NpmServer from "./npm-server";
import type { path, url } from "../types";
import * as rimraf from "rimraf";
import * as Log from "../logger";
import { pkg } from "./package";
import * as Defaults from "./defaults";
import * as Utils from "./utils";
import { esy, esyi, withPrefixPath, setupTemporaryEsyPrefix } from "./esy";

const debug = require("debug")("bale:lib:info");
export let localNpmRc = `${
  process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME
}/.npmrc`;

export * from "./npm-session";
export * from "./package";
export * from "./fetch";

export async function createSession(
  server: NpmServer.$Server,
): Promise<string> {
  let token: string;
  let testUsername = "foo-" + crypto.randomBytes(4).toString("hex"); // TODO centralise this
  let testEmail = "foo@bar.com"; // TODO centralise this
  let testPassword = "bar"; // TODO centralise this
  const registryUrl = NpmServer.getUrl(server);
  try {
    debug("Attempting npm login");
    token = await Npm.login(testUsername, testPassword, registryUrl);
  } catch (e) {
    console.log(e);
    debug("NPM login failed. Attempting adduser");
    token = await Npm.addUser(
      testUsername,
      testEmail,
      testPassword,
      registryUrl,
    );
  }
  return token;
}

function cleanup(server: any): void {
  if (server) {
    NpmServer.stop(server);
  }
}

async function runE2E(
  packageRecipeTestsPath: path,
  userSpecifiedPrefixPath: path,
  registryUrl: url,
) {
  let testProjectPath = Path.join(Os.tmpdir(), "esy-test");
  if (fse.existsSync(packageRecipeTestsPath)) {
    Log.info("Running end-to-end test project");
    Log.info("Clearing path meant for test project", testProjectPath);
    rimraf.sync(testProjectPath);
  }
  if (fse.existsSync(packageRecipeTestsPath)) {
    fse.copySync(packageRecipeTestsPath, testProjectPath, {
      overwrite: true,
    });
    const prefixPath = userSpecifiedPrefixPath ?? setupTemporaryEsyPrefix();
    Log.info("Running esy install");
    Log.process(
      "esy-install",
      await esyi({ cwd: testProjectPath, prefixPath, registryUrl }),
    );
    Log.info("Running esy");
    await esy({ cwd: testProjectPath, prefixPath, registryUrl });
  }
}

async function fetchAndPkg(pack: string, cwd: path) {
  Log.info("Packaging");
  // TODO Ensure user provided packing commands
  // and our default steps have a common understanding
  // about where to place the packaged tarball etc.
  if (pack) {
    pack
      .split("&&")
      .map((s) => s.trim())
      .forEach((command) => {
        cp.execSync(command);
      });
  } else {
    await pkg(cwd);
  }
  return `${cwd}/package.tar.gz`;
}

async function setupLocalVerdaccio(
  storagePath: path,
  manifest: any,
  registryLogLevel: string,
) {
  Log.info("Setting up local verdaccio server");
  return NpmServer.setup(storagePath, manifest, registryLogLevel);
}

async function publishToLocalVerdaccio(
  server: any,
  tarballPath: path,
  cwd: path,
) {
  Log.info("Publishing to verdaccio server");
  const registryUrl = NpmServer.getUrl(server);
  const token = await createSession(server);
  // Writing to .npmrc by hand. See docs/notes.org to see why
  const tokenFile = Path.join(cwd, "_esy-package", ".npmrc");
  const { addr, port } = server;
  fs.appendFileSync(tokenFile, `//${addr}:${port}/:_authToken="${token}"\n`);
  Log.process(
    "verdaccio",
    await NpmClient.publish(registryUrl, tarballPath, tokenFile),
  );
}

async function getLocalVerdaccioWithPackage(
  pack: string, // TODO make it optional
  cwd: path,
  storagePath: path,
  registryLogLevel: string,
): Promise<NpmServer.$Server> {
  const manifest = require(Path.join(cwd, "esy.json"));
  const tarballPath = await fetchAndPkg(pack, cwd);
  const server = await setupLocalVerdaccio(
    storagePath,
    manifest,
    registryLogLevel,
  );
  await publishToLocalVerdaccio(server, tarballPath, cwd);
  return server;
}

async function withPackagePublishedToLocalTestEnv(
  pack: string, // TODO make it optional
  cwd: path,
  storagePath: path,
  registryLogLevel: string,
  f: (server: NpmServer.$Server) => Promise<void>,
): Promise<void> {
  const server = await getLocalVerdaccioWithPackage(
    pack,
    cwd,
    storagePath,
    registryLogLevel,
  );
  await f(server);
  cleanup(server);
}

export async function defaultCommand(
  pack: string,
  cwd: path,
  storagePath: path = Defaults.storagePath,
  userSpecifiedPrefixPath: path = null,
  registryLogLevel: string,
) {
  let returnStatus: number;
  let server: any;
  try {
    Log.info("Setting up separate testing area on temporary directory");
    const packageRecipeTestsPath = Path.join(cwd, "esy-test");
    if (fse.existsSync(packageRecipeTestsPath)) {
      // TODO If the package recipe author doesn't provide a test
      // create a simple test by placing a esy.json with the package
      // as dependency
      // {
      //    "dependencies": "pkg"
      // }
      await withPackagePublishedToLocalTestEnv(
        pack,
        cwd,
        storagePath,
        registryLogLevel,
        async (server: NpmServer.$Server) => {
          const registryUrl = NpmServer.getUrl(server);
          await runE2E(
            packageRecipeTestsPath,
            userSpecifiedPrefixPath,
            registryUrl,
          );
        },
      );
    }
    returnStatus = 0;
  } catch (e) {
    Log.error(e.message);
    Log.error(e.stack);
    returnStatus = -1;
  } finally {
    cleanup(server);
  }
  process.exit(returnStatus);
}

async function e2eShell(
  packageRecipeTestsPath: path,
  userSpecifiedPrefixPath: path,
  registryUrl: url,
): Promise<void> {
  return new Promise((resolve) => {
    let testProjectPath = Path.join(Os.tmpdir(), "esy-test");
    Log.info("Clearing path meant for test project", testProjectPath);
    rimraf.sync(testProjectPath);
    fse.copySync(packageRecipeTestsPath, testProjectPath, {
      overwrite: true,
    });
    const prefixPath = userSpecifiedPrefixPath ?? setupTemporaryEsyPrefix();
    Log.info("Dropping into a shell to debug");
    // We earlier used /bin/bash On Windows it's advisable to simply use
    // bash because Windows has two environments. Cygwin and Native Shells
    // (cmd and powershell)
    // When in cygwin, if one spawns /bin/bash, it still won't work
    // unless the node.js was linked with cygwin.dll, ie. a C-Runtime that
    // understand cygwin paths.
    // With Powershell and cmd, /bin/bash wont work for obvious reasons
    // It's also important to disable shell with spawn, otherwise Node.js
    // will launch an extra shell process to run our shell inside it
    // But since we dont implement our own path resolution of the command,
    // with $PATH, spawn wont work reliably with just command names.
    // (Eg. esy.cmd ENOENT)
    // Also, using pwsh puts a hard dependency on the new Powershell 7
    const bash = cp.spawn(process.platform === "win32" ? "pwsh" : "bash", [], {
      stdio: "inherit",
      env: {
        ...process.env,
        NPM_CONFIG_REGISTRY: registryUrl,
        ESY__PREFIX: prefixPath,
      },
      cwd: testProjectPath,
    });
    bash.on("close", resolve);
  });
}

export async function shellCommand(
  pack: string,
  cwd: path,
  storagePath: path = Defaults.storagePath,
  userSpecifiedPrefixPath: path = null,
  registryLogLevel: string,
) {
  let returnStatus: number;
  let server: any;
  try {
    Log.info("Setting up separate testing area on temporary directory");
    const packageRecipeTestsPath = Path.join(cwd, "esy-test");
    if (fse.existsSync(packageRecipeTestsPath)) {
      // TODO see note in defaultCommand
      const server = await getLocalVerdaccioWithPackage(
        pack,
        cwd,
        storagePath,
        registryLogLevel,
      );
      const registryUrl = NpmServer.getUrl(server);
      await e2eShell(
        packageRecipeTestsPath,
        userSpecifiedPrefixPath,
        registryUrl,
      );
    }
    returnStatus = 0;
  } catch (e) {
    Log.error(e.message);
    Log.error(e.stack);
    returnStatus = -1;
  } finally {
    cleanup(server);
  }
  process.exit(returnStatus);
}

export async function generate(cwd: path, pkg: string): Promise<void> {
  const seen = new Map();
  let queue = [pkg];
  while (queue.length) {
    const pkg = queue.shift();
    seen.set(pkg, true);
    if (/^python/.test(pkg)) {
      continue;
    }
    Log.info("Generating recipe for %s", pkg);
    const generatedManifestName = `${pkg}.json`;
    const generatedManifestPath = Path.join(
      cwd,
      "esy-dependencies",
      pkg,
      "esy.json",
    );
    let npmMetaData;
    try {
      npmMetaData = cp
        .execSync(`npm info esy-${pkg}`, { stdio: [null, "pipe", null] })
        .toString()
        .trim();
    } catch {}
    if (!npmMetaData) {
      const brewFormulaPath = cp
        .execSync(`brew edit ${pkg} --print-path`, {
          stdio: [null, "pipe", null],
        })
        .toString()
        .trim();
      const etcPath = (file) =>
        Path.join(Path.resolve(__dirname, "..", "..", "etc"), file);
      const etc = {
        language: etcPath("language.rb"),
        print: etcPath("print.rb"),
        formulaBaseClass: etcPath("formula.rb"),
      };
      fs.writeFileSync(
        "run.rb",
        `
require "${etc.language}" 
require "${etc.formulaBaseClass}" 
require "${brewFormulaPath}"
require "${etc.print}"

name = "esy-${pkg}"
version = "0.1.0"
pkg = ${pkg
          .split("-")
          .map(Utils.capitalizeFirstLetter)
          .join("")
          .replace("@", "AT")
          .replace(".", "")}.new
pkg.install
print_json(name, version, pkg)
`,
      );
      try {
        const jsonStr = cp
          .execSync(`ruby run.rb`, { stdio: [null, "pipe", null] })
          .toString()
          .trim();

        const json = JSON.parse(jsonStr);
        fs.mkdirSync(Path.dirname(generatedManifestPath), { recursive: true });
        fs.writeFileSync(generatedManifestPath, jsonStr);
        Log.info("Created manifest at %o", generatedManifestPath);
        queue = queue.concat(
          (Object.keys(json.override.dependencies) || [])
            .map((dep) =>
              dep
                .replace(/{[^}]+}/, "")
                // .split("@")[0]
                .replace("esy-", ""),
            )
            .filter((a) => a !== "")
            .filter((pkg) => !seen.get(pkg)),
        );
      } catch (e) {
        console.log(e.stdout?.toString());
        console.log(e.stderr?.toString());
      }
    }
  }
}
