import * as cp from "child_process";
import Path from "path";
import Os from "os";
import fse from "fs-extra";
import * as Bale from "../lib";
import * as NpmServer from "../lib/npm-server";
import * as NpmClient from "../lib/npm-client";
import type { path } from "../types";
import * as rimraf from "rimraf";
import * as Log from "../logger";
import { pkg } from "./package";
import * as Defaults from "./defaults";
import { esy, esyi, withPrefixPath } from "./esy";
import { REGISTRY_ADDR, REGISTRY_PORT, REGISTRY_URL } from "../config";

function cleanup(server: any): void {
  NpmServer.stop(server);
}

export async function defaultCommand(
  pack: string,
  cwd: path,
  storagePath: path = Defaults.storagePath,
  prefixPath: path = null
) {
  let manifest = require(Path.join(cwd, "esy.json"));
  let returnStatus: number;
  Log.info("Setting up");
  Log.info("Clearing storage path meant for verdaccio", storagePath);
  rimraf.sync(storagePath);
  fse.mkdirp(storagePath);
  let server: any;
  Log.info("Initialising verdaccio server");
  server = await NpmServer.init(
    manifest.name,
    "/unnecessary-path.yml",
    storagePath,
    REGISTRY_ADDR,
    REGISTRY_PORT
  );
  await NpmServer.start(server);
  Log.info("Setting up verdaccio user session");
  await Bale.createSession();
  Log.info("Packaging");
  try {
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
    Log.info("Verdaccio registry started");
    let tarballPath = `${cwd}/package.tar.gz`;
    Log.process(
      "verdaccio",
      await NpmClient.publish(REGISTRY_URL, tarballPath)
    );
    Log.info("Running test project");
    let testProjectPath = Path.join(Os.tmpdir(), "esy-test");
    Log.info("Clearing path meant for test project", testProjectPath);
    rimraf.sync(testProjectPath);
    fse.copySync("./esy-test", testProjectPath, { overwrite: true });
    if (prefixPath) {
      Log.info("User provided prefix path", prefixPath);
      Log.info("Running esy install");
      Log.process(
        "esy-install",
        await esyi({ cwd: testProjectPath, prefixPath })
      );
      Log.info("Running esy");
      await esy({ cwd: testProjectPath, prefixPath });
    } else {
      await withPrefixPath(async (prefixPath) => {
        Log.info("Running esy install");
        Log.process(
          "esy-install",
          await esyi({ cwd: testProjectPath, prefixPath })
        );
        Log.info("Running esy");
        await esy({ cwd: testProjectPath, prefixPath });
      });
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
