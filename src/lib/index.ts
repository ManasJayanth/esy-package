import * as cp from "child_process";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import * as url from "url";
import * as fs from "fs";
import { uncompress } from "./compression";
import { mkdirpSync, fetch, copy } from "./utils";

function computeChecksum(filePath, algo) {
  return new Promise((resolve, reject) => {
    let stream = fs.createReadStream(filePath).pipe(crypto.createHash(algo));
    let buf = "";
    stream.on("data", (chunk) => {
      buf += chunk.toString("hex");
    });
    stream.on("end", () => {
      resolve(buf);
    });
  });
}

function download(urlStrWithChecksum, pkgPath) {
  return new Promise(function (resolve, reject) {
    let [urlStr, checksum] = urlStrWithChecksum.split("#");
    if (!urlStr) {
      reject(`No url in ${urlStr}`);
    } else if (!checksum) {
      reject(`No checksum in ${urlStr}`);
    }

    let urlObj = url.parse(urlStr);
    let filename = path.basename(urlObj.path);
    let tmpDownloadedPath = path.join(os.tmpdir(), "esy-package-" + filename);

    let protoParts = urlObj.protocol.split("+");

    if (protoParts.length > 2) {
      reject("Unrecognised protocol " + urlObj.protocol);
    } else if (protoParts.length === 2) {
      let [a, b] = protoParts;
      if (a === "git") {
        let gitUrl = url.format({ ...urlObj, protocol: b });

        if (fs.existsSync(tmpDownloadedPath)) {
          reject("TODO: run rm -rf");
        } else {
          let destDir = path.join(pkgPath, "git-source"); // TODO: not network resilient. Any interruptions will corrupt the path
          cp.execSync(`git clone ${gitUrl} ${destDir}`);
          let commitHash = checksum;
          cp.execSync(`git -C ${destDir} checkout ${commitHash}`);
          resolve(destDir);
        }
      } else {
        reject("Unrecognised protocol " + urlObj.protocol);
      }
    } else {
      let [algo, hashStr] = checksum.split(":");
      if (!hashStr) {
        hashStr = algo;
        algo = "sha1";
      }

      if (fs.existsSync(tmpDownloadedPath)) {
          computeChecksum(tmpDownloadedPath, algo).then((checksum) => {
          if (hashStr == checksum) {
            uncompress(tmpDownloadedPath, pkgPath);
            resolve(tmpDownloadedPath);
          } else {
            fetch(urlStr, urlObj, tmpDownloadedPath, () =>
		computeChecksum(tmpDownloadedPath, algo).then((checksum) => {
                if (hashStr == checksum) {
                  uncompress(tmpDownloadedPath, pkgPath);
                  resolve(tmpDownloadedPath);
                } else {
                  reject(`Checksum error: expected ${hashStr} got ${checksum}`);
                }
              })
            );
          }
        });
      } else {
        fetch(urlStr, urlObj, tmpDownloadedPath, () =>
            computeChecksum(tmpDownloadedPath, algo).then((checksum) => {
            if (hashStr == checksum) {
              uncompress(tmpDownloadedPath, pkgPath);
              resolve(tmpDownloadedPath);
            } else {
              reject(`Checksum error: expected ${hashStr} got ${checksum}`);
            }
          })
        );
      }
    }
  });
}

const cwd = process.argv[2] || process.cwd();
let manifest = require(path.join(cwd, "esy.json"));

let {
  source,
  name,
  version,
  description,
  override: { build, install, buildsInSource, dependencies },
} = manifest;

let esyPackageDir = path.join(cwd, "_esy-package");
mkdirpSync(esyPackageDir);
let pkgPath = esyPackageDir;
download(source, pkgPath)
  .then(() => {
    let entries = fs.readdirSync(pkgPath);
    if (entries.length > 1) {
      // Extracted tarball is not wrapped by a single root directory. The entire `pkgPath` must be considered as package root
      return pkgPath;
    } else {
      return path.join(pkgPath, entries[0]);
    }
  })
  .then((pkgPath) => {
    function filterComments(o = {}) {
      return Object.keys(o)
        .filter((k) => !k.startsWith("//"))
        .reduce((acc, k) => {
          acc[k] = o[k];
          return acc;
        }, {});
    }
    let buildEnv = filterComments(manifest.override.buildEnv);
    let exportedEnv = filterComments(manifest.override.exportedEnv);
    let esy = { buildsInSource, build, install, buildEnv, exportedEnv };
    let patchFilesPath = path.join(cwd, "files");
    if (fs.existsSync(patchFilesPath)) {
      copy(patchFilesPath, pkgPath);
    }
    fs.writeFileSync(
      path.join(pkgPath, "package.json"),
      JSON.stringify({ name, version, description, esy, dependencies }, null, 2)
    );
    fs.writeFileSync(
      path.join(pkgPath, ".npmignore"),
      `
_esy
`
    );
    cp.execSync("npm pack", { cwd: pkgPath });
    fs.renameSync(
      path.join(pkgPath, `${name}-${version}.tgz`),
      path.join(cwd, "package.tar.gz")
    );
  });
