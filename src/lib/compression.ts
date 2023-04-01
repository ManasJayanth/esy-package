import * as cp from "child_process";
import * as path from "path";

export function tar(filePath, destDir, gzip?) {
  cp.execSync(`tar -x${gzip ? "z" : ""}f ${filePath} -C ${destDir}`, {
    stdio: "inherit",
  });
}

export function unzip(filePath, destDir) {
  cp.execSync(`unzip -o ${filePath} -d ${destDir}`);
}

export function uncompress(pathStr, pkgPath) {
  switch (path.extname(pathStr)) {
    case ".tgz":
    case ".gz":
      tar(pathStr, pkgPath, true);
      break;
    case ".xz":
      tar(pathStr, pkgPath);
      break;
    case ".zip":
      unzip(pathStr, pkgPath);
      break;
  }
}
