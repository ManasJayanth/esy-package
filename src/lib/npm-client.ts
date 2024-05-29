import * as cp from "child_process";
import type { url, path, ProcessOutput } from "../types";

export async function publish(
  registryUrl: url,
  tarballPath: path,
  userconfig: path,
): Promise<ProcessOutput> {
  return new Promise(function (resolve, reject) {
    cp.exec(
      `npm publish --userconfig ${userconfig} --registry ${registryUrl} ${tarballPath}`,
      { maxBuffer: 5000 * 1024 },
      (error: Error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      },
    );
  });
}

export async function pack(pkgPath: path): Promise<ProcessOutput> {
  return new Promise(function (resolve, reject) {
    cp.exec(
      "npm pack",
      { cwd: pkgPath, maxBuffer: 5000 * 1024 },
      (error: cp.ExecException, stdout: string, stderr: string) => {
        if (error) {
          reject(error);
        } else {
          resolve({ stdout, stderr });
        }
      },
    );
  });
}
