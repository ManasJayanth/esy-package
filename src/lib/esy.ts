import type { path, url, ProcessOutput } from "../types";
import * as cp from "child_process";
import Path from "path";
import Os from "os";
import rimraf from "rimraf";
type Opts = { cwd: path; prefixPath: path; registryUrl: url };
import Debug from "debug";

const debug = Debug("bale:esy");

function craftEnv(registryUrl: string, prefixPath: string) {
  let env = {
    NPM_CONFIG_REGISTRY: registryUrl,
    ESY__PREFIX: prefixPath,
    ...process.env,
  };
  delete env["_"];
  return env;
}

async function subcommand(
  cmd: string,
  cwd: path,
  prefixPath: path,
  registryUrl: url,
): Promise<ProcessOutput> {
  let env = craftEnv(registryUrl, prefixPath);
  delete env["_"];
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
      },
    );
  });
}

export async function esy(opts: Opts): Promise<ProcessOutput> {
  let { cwd, prefixPath, registryUrl } = opts;
  let env = craftEnv(registryUrl, prefixPath);
  debug(cwd);
  debug(env);
  let execCmd = "esy"; // + (process.platform === "win32" ? ".cmd" : "");
  debug(`Running cmd: ${execCmd}`);
  return subcommand("", cwd, prefixPath, registryUrl);
}

export async function esyi(opts: Opts): Promise<ProcessOutput> {
  let { cwd, prefixPath, registryUrl } = opts;
  return subcommand("install", cwd, prefixPath, registryUrl);
}

export function setupTemporaryEsyPrefix(): path {
  let prefixPath = Path.join(Os.tmpdir(), "bale-esy-prefix");
  debug("Clearing path meant for esy prefix", prefixPath);
  rimraf.sync(prefixPath);
  return prefixPath;
}

export async function withPrefixPath(
  f: (prefixPath: path) => Promise<void>,
): Promise<void> {
  await f(setupTemporaryEsyPrefix());
}
