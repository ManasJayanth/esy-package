import * as fs from "fs";
import * as path from "path";
import * as url from "url";
import * as os from "os";
import * as cp from "child_process";
import { uncompress } from "./compression";
import * as crypto from "crypto";

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

export function mkdirpSync(pathStr) {
  if (fs.existsSync(pathStr)) {
    return;
  } else {
    mkdirpSync(path.dirname(pathStr));
    fs.mkdirSync(pathStr);
  }
}

export function copy(src, dest) {
  let srcStat = fs.statSync(src);
  if (srcStat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      mkdirpSync(dest);
    }
    let srcEntries = fs.readdirSync(src);
    for (let srcEntry of srcEntries) {
      copy(path.join(src, srcEntry), path.join(dest, srcEntry));
    }
  } else {
    fs.writeFileSync(dest, fs.readFileSync(src));
  }
}

export function fetch(urlStr, urlObj, pathStr, callback) {
  let httpm;
  switch (urlObj.protocol) {
    case "http:":
      httpm = require("http");
      break;
    case "https:":
      httpm = require("https");
      break;
    default:
      throw `Unrecognised protocol in provided url: ${urlStr}`;
  }
  httpm.get(urlObj, function (response) {
    if (response.statusCode == 302) {
      let urlStr = response.headers.location;
      fetch(urlStr, url.parse(urlStr), pathStr, callback);
    } else {
      response.pipe(fs.createWriteStream(pathStr)).on("finish", function () {
        callback(pathStr);
      });
    }
  });
}

export function pathNormalise(p: string): string {
  if (process.platform === "win32" && /bash\.exe/.test(process.env.SHELL)) {
    let letter = process.env.HOMEDRIVE.replace(":", "").toLowerCase();
    return p.replace(/\\/g, "/").replace(process.env.HOMEDRIVE, `/${letter}`);
  } else {
    return p;
  }
}

export function download(urlStrWithChecksum, pkgPath) {
  return new Promise(async function (resolve, reject) {
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
        let checksum = await computeChecksum(tmpDownloadedPath, algo);
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
