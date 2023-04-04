import * as fs from "fs";
import * as path from "path";
import * as url from "url";

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
