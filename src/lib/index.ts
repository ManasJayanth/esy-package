import * as cp from "child_process";
import Debug from "debug";
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
import { esy, esyi, withPrefixPath, setupTemporaryEsyPrefix } from "./esy";

const debug = Debug("bale:lib:info");
export let localNpmRc = `${
  process.platform === "win32" ? process.env.USERPROFILE : process.env.HOME
}/.npmrc`;

export * from "./npm-session";
export * from "./package";
export * from "./fetch";

export async function createSession(registryUrl: string): Promise<string> {
  let token: string;
  let testUsername = "foo-" + crypto.randomBytes(4).toString("hex"); // TODO centralise this
  let testEmail = "foo@bar.com"; // TODO centralise this
  let testPassword = "bar"; // TODO centralise this
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
  // Writing to .npmrc by hand. See docs/notes.org to see why
  fs.appendFileSync(localNpmRc, `//${registryUrl}/:_authToken="${token}"\n`);
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

async function setupLocalVerdaccio(storagePath: path, manifest: any) {
  Log.info("Setting up local verdaccio server");
  return NpmServer.setup(storagePath, manifest);
}

async function publishToLocalVerdaccio(registryUrl: url, tarballPath: path) {
  Log.info("Publishing to verdaccio server");
  await createSession(registryUrl);
  Log.process("verdaccio", await NpmClient.publish(registryUrl, tarballPath));
}

async function getLocalVerdaccioWithPackage(
  pack: string, // TODO make it optional
  cwd: path,
  storagePath: path,
): Promise<NpmServer.$Server> {
  const manifest = require(Path.join(cwd, "esy.json"));
  const tarballPath = await fetchAndPkg(pack, cwd);
  const server = await setupLocalVerdaccio(storagePath, manifest);
  const registryUrl = NpmServer.getUrl(server);
  await publishToLocalVerdaccio(registryUrl, tarballPath);
  return server;
}

async function withPackagePublishedToLocalTestEnv(
  pack: string, // TODO make it optional
  cwd: path,
  storagePath: path,
  f: (server: NpmServer.$Server) => Promise<void>,
): Promise<void> {
  const server = await getLocalVerdaccioWithPackage(pack, cwd, storagePath);
  await f(server);
  cleanup(server);
}

export async function defaultCommand(
  pack: string,
  cwd: path,
  storagePath: path = Defaults.storagePath,
  userSpecifiedPrefixPath: path = null,
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
    const bash = cp.spawn("/bin/bash", [], {
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
) {
  let returnStatus: number;
  let server: any;
  try {
    Log.info("Setting up separate testing area on temporary directory");
    const packageRecipeTestsPath = Path.join(cwd, "esy-test");
    if (fse.existsSync(packageRecipeTestsPath)) {
      // TODO see note in defaultCommand
      const server = await getLocalVerdaccioWithPackage(pack, cwd, storagePath);
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
