import type { path, ProcessOutput } from "../types";
import * as cp from "child_process";
import Path from "path";
import Os from "os";
import rimraf from "rimraf";
import { REGISTRY_URL } from "../config";
type Opts = { cwd: path; prefixPath: path };
import Debug from "debug";

const debug = Debug("bale:esy");

async function subcommand(
  cmd: string,
  cwd: path,
  prefixPath: path
): Promise<ProcessOutput> {
  return new Promise(function (resolve, reject) {
    let env = {
      NPM_CONFIG_REGISTRY: REGISTRY_URL,
      ESY__PREFIX: prefixPath,
      ...process.env,
    };
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
	maxBuffer: 1024 * 500
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

export async function esy(opts: Opts): Promise<ProcessOutput> {
  let { cwd, prefixPath } = opts;
  return subcommand("", cwd, prefixPath);
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
