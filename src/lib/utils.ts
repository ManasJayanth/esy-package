import * as fs from "fs-extra";
import * as path from "path";
import * as url from "url";
import * as os from "os";
import * as cp from "child_process";
import { uncompress } from "./compression";
import * as crypto from "crypto";
import { uname } from "./platform";
import type { path as $path } from "../types";
import type { UrlWithStringQuery } from "url";

export async function cygpath(path: string) {
  let platform: string;
  try {
    platform = await uname();
  } catch (e) {
    platform = "Windows";
  }

  if (/cygwin/i.test(platform) || /mingw/i.test(platform)) {
    path = cp.execSync(`cygpath -u ${path}`).toString().trim();
  }

  return path;
}

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

export function fetch(urlObj: UrlWithStringQuery, pathStr: string) {
  let httpm;
  switch (urlObj.protocol) {
    case "http:":
      httpm = require("http");
      break;
    case "https:":
      httpm = require("https");
      break;
    default:
      throw new Error(
        `fetch(): Unrecognised protocol in provided url: ${url.format(urlObj)}`,
      );
  }
  return new Promise(function (resolve, reject) {
    httpm
      .get(urlObj, function (response) {
        if (response.statusCode == 302) {
          let urlStr = response.headers.location;
          fetch(url.parse(urlStr), pathStr).then(resolve).catch(reject);
        } else if (response.statusCode > 100 && response.statusCode < 300) {
          response
            .pipe(fs.createWriteStream(pathStr))
            .on("finish", function () {
              resolve(pathStr);
            });
        } else {
          reject(
            new Error(`Non 200 statusCode for url: ${url.format(urlObj)}`),
          );
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

class AmbiguousFileDirName extends Error {
  path: string;
  likelyCandidate: string;
  constructor(p) {
    let message = `Path ${p} is ambiguously a file. Could be a directory`;
    super(message);
    this.path = p;
    this.likelyCandidate = path.basename(this.path);
  }
}
function isDefinitelyFile(urlPath: string): boolean {
  return path.extname(urlPath) !== "";
}

/**
 * Accepts URL and checksum in a string, eg https://example.com/file#sha1:39bc88114c7ba47b06398e0f31e358a7941919f4,
 * a path where the file must be downloaded to, and returns a Promise
 * If path doesnt exist, checks if it contains filename at the end (filenames usually contain a dot)
 * if it's a filename, parent directory is mkdirp()'d
 * else the path is mkdirp()'d
 * if path exists, it checks if it contains a filename at the end
 * if it contains filename and it exists, checksum is compared to see if download is necessary
 * it it doesn't contain filename, filename inference is attempted from URL. Error is thrown if it fails
 */
export async function download(urlStrWithChecksum: $path, pkgPath: $path) {
  let [urlStr, checksum] = urlStrWithChecksum.split("#");
  if (!urlStr) {
    throw new Error(`No url in ${urlStr}`);
  } else if (!checksum) {
    throw new Error(`No checksum in ${urlStr}`);
  }
  let urlObj = url.parse(urlStr);
  let urlPath = urlObj.path;

  let filename, likelyCandidateForFilename, downloadedPath;
  if (isDefinitelyFile(pkgPath)) {
    filename = path.basename(pkgPath);
    downloadedPath = pkgPath;
  } else {
    if (isDefinitelyFile(urlPath)) {
      filename = path.basename(urlPath);
      downloadedPath = path.join(pkgPath, filename);
    } else {
      likelyCandidateForFilename = path.basename(urlPath);
    }
  }

  if (downloadedPath) {
    await fs.mkdirp(path.dirname(downloadedPath));
  }

  let protoParts = urlObj.protocol.split("+");

  if (protoParts.length > 2) {
    throw new Error("Unrecognised protocol " + urlObj.protocol);
  }
  if (protoParts.length === 2) {
    let [a, b] = protoParts;
    if (a === "git") {
      let gitUrl = url.format({ ...urlObj, protocol: b });

      let destDir = path.join(pkgPath, path.basename(urlPath));
      if (fs.existsSync(destDir)) {
        throw new Error("TODO: run rm -rf");
      } else {
        cp.execSync(`git clone --recurse-submodules ${gitUrl} ${destDir}`); // TODO: not network resilient. Any interruptions will corrupt the path
        let commitHash = checksum;
        cp.execSync(`git -C ${destDir} checkout ${commitHash}`);
        return;
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

  async function fetchWithChecksumCmp(
    urlStr,
    downloadPath,
    checksumAlgo,
    hashStr,
  ) {
    let tmpDownloadPath = downloadPath + ".tmp";
    await fetch(url.parse(urlStr), tmpDownloadPath);
    let checksum = await computeChecksum(tmpDownloadPath, checksumAlgo);
    if (hashStr !== checksum) {
      throw new Error(
        `Downloaded by checksum failed. url: ${url} downloadPath: ${downloadPath} checksum expected: ${hashStr} checksum computed: ${checksum} checksum algorithm: ${checksumAlgo}`,
      );
    } else {
      await fs.move(tmpDownloadPath, downloadPath);
    }
  }

  if (!fs.existsSync(downloadedPath)) {
    await fetchWithChecksumCmp(urlStr, downloadedPath, algo, hashStr);
  }

  await uncompress(downloadedPath, pkgPath);

  return downloadedPath;
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
