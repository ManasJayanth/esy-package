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

export function fetch(urlStr, urlObj, pathStr) {
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
  return new Promise(function (resolve, reject) {
    httpm
      .get(urlObj, function (response) {
        if (response.statusCode == 302) {
          let urlStr = response.headers.location;
          fetch(urlStr, url.parse(urlStr), pathStr).then(resolve).catch(reject);
        } else if (response.statusCode > 100 && response.statusCode < 300) {
          response
            .pipe(fs.createWriteStream(pathStr))
            .on("finish", function () {
              resolve(pathStr);
            });
        } else {
          reject(new Error("non 200 statusCode"));
        }
      })
      .on("error", reject);
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

export async function download(urlStrWithChecksum, pkgPath) {
  let [urlStr, checksum] = urlStrWithChecksum.split("#");
  if (!urlStr) {
    throw new Error(`No url in ${urlStr}`);
  } else if (!checksum) {
    throw new Error(`No checksum in ${urlStr}`);
  }
  let urlObj = url.parse(urlStr);
  let filename = path.basename(urlObj.path);
  let tmpDownloadedPath = path.join(os.tmpdir(), "esy-package-" + filename);

  let protoParts = urlObj.protocol.split("+");

  if (protoParts.length > 2) {
    throw new Error("Unrecognised protocol " + urlObj.protocol);
  }
  if (protoParts.length === 2) {
    let [a, b] = protoParts;
    if (a === "git") {
      let gitUrl = url.format({ ...urlObj, protocol: b });

      if (fs.existsSync(tmpDownloadedPath)) {
        throw new Error("TODO: run rm -rf");
      } else {
        let destDir = path.join(pkgPath, "git-source"); // TODO: not network resilient. Any interruptions will corrupt the path
        cp.execSync(`git clone ${gitUrl} ${destDir}`);
        let commitHash = checksum;
        cp.execSync(`git -C ${destDir} checkout ${commitHash}`);
        return destDir;
      }
    } else {
      throw new Error("Unrecognised protocol " + urlObj.protocol);
    }
  }

  let [algo, hashStr] = checksum.split(":");
  if (!hashStr) {
    hashStr = algo;
    algo = "sha1";
  }

  if (fs.existsSync(tmpDownloadedPath)) {
    let checksum = await computeChecksum(tmpDownloadedPath, algo);
    if (hashStr == checksum) {
      uncompress(tmpDownloadedPath, pkgPath);
      return tmpDownloadedPath;
    } else {
      await fetch(urlStr, urlObj, tmpDownloadedPath);
      let checksum = await computeChecksum(tmpDownloadedPath, algo);
      if (hashStr == checksum) {
        uncompress(tmpDownloadedPath, pkgPath);
        return tmpDownloadedPath;
      } else {
        throw new Error(`Checksum error: expected ${hashStr} got ${checksum}`);
      }
    }
  } else {
    await fetch(urlStr, urlObj, tmpDownloadedPath);
    let checksum = await computeChecksum(tmpDownloadedPath, algo);
    if (hashStr == checksum) {
      uncompress(tmpDownloadedPath, pkgPath);
      return tmpDownloadedPath;
    } else {
      throw new Error(`Checksum error: expected ${hashStr} got ${checksum}`);
    }
  }
}
