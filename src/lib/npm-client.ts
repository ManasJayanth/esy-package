import * as cp from "child_process";
import type { url, path, ProcessOutput } from "../types";

export async function publish(
  registryUrl: url,
  tarballPath: path
): Promise<ProcessOutput> {
  return new Promise(function (resolve, reject) {
    cp.exec(
      `npm publish --registry ${registryUrl} ${tarballPath}`,
      {},
      (error: Error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      }
    );
  });
}

export async function pack(pkgPath: path): Promise<ProcessOutput> {
  return new Promise(function (resolve, reject) {
    cp.exec(
      "npm pack",
      { cwd: pkgPath },
      (error: cp.ExecException, stdout: string, stderr: string) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      }
    );
  });
}
