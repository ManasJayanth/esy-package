import * as cp from "child_process";
import * as path from "path";
import { pathNormalise, cygpath } from "./utils";
import * as tar from "tar";

export function unzip(filePath, destDir) {
  return Promise.resolve(cp.execSync(`unzip -o ${filePath} -d ${destDir}`));
}

export async function uncompress(pathStr, pkgPath) {
  pathStr = await cygpath(pathStr);
  pkgPath = await cygpath(pkgPath);
  const filePath = pathNormalise(pathStr);
  const destDir = pathNormalise(pkgPath);
  switch (path.extname(pathStr)) {
    case ".tgz":
    case ".gz":
      return tar.x({ f: filePath, C: destDir, z: true });
    case ".bz2":
    case ".xz":
      return tar.x({ f: filePath, C: destDir });
      break;
    case ".zip":
      return unzip(pathStr, pkgPath);
      break;
  }
}
