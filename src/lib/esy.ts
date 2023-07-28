import type { path, ProcessOutput } from "../types";
import * as Log from "../logger";
import * as cp from "child_process";
import Path from "path";
import Os from "os";
import rimraf from "rimraf";
import { REGISTRY_URL } from "../config";
type Opts = { cwd: path; prefixPath: path };
import Debug from "debug";

const debug = Debug("bale:esy");

function craftEnv(registryUrl: string, prefixPath: string) {
  return {
    NPM_CONFIG_REGISTRY: registryUrl,
    ESY__PREFIX: prefixPath,
    ...process.env,
  };
}

async function subcommand(
  cmd: string,
  cwd: path,
  prefixPath: path
): Promise<ProcessOutput> {
  let env = craftEnv(REGISTRY_URL, prefixPath);
  return new Promise(function (resolve, reject) {
    debug(cwd);
    debug(env);
    let execCmd: string;
    if (cmd !== "") {
      execCmd = `esy ${cmd}`;
    } else {
      execCmd = "esy";
    }
    debug(`Running cmd: ${execCmd}`);
    // TODO santise subcommand
    cp.exec(
      execCmd,
      {
        cwd,
        env,
      },
      (error: Error, stdout: string, stderr: string) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      }
    );
  });
}

export async function esy(opts: Opts): Promise<void> {
  let { cwd, prefixPath } = opts;
  let env = craftEnv(REGISTRY_URL, prefixPath);
  return new Promise(function (resolve, reject) {
    debug(cwd);
    debug(env);
    let execCmd = "esy" + (process.platform === "win32" ? ".cmd" : "");
    debug(`Running cmd: ${execCmd}`);
    // TODO santise subcommand
    let esy = cp.spawn(execCmd, [], {
      cwd,
      env,
      stdio: "pipe",
    });
    esy.stdout.on("data", (c) => {
      Log.info("esy:stdout", c.toString());
    });
    esy.stderr.on("data", (c) => {
      Log.info("esy:stderr", c.toString());
    });
    esy.on("close", (exitCode) => {
      if (exitCode !== 0) {
        reject(new Error("esy returned non-zero exit code"));
      } else {
        resolve();
      }
    });
  });
}

export async function esyi(opts: Opts): Promise<ProcessOutput> {
  let { cwd, prefixPath } = opts;
  return subcommand("install", cwd, prefixPath);
}

export async function withPrefixPath(
  f: (prefixPath: path) => Promise<void>
): Promise<void> {
  let prefixPath = Path.join(Os.tmpdir(), "bale-esy-prefix");
  debug("Clearing path meant for esy prefix", prefixPath);
  rimraf.sync(prefixPath);
  await f(prefixPath);
}
