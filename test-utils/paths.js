const os = require("os");
const path = require("path");

function genRandomID(low, high) {
  let r = Math.floor(Math.random() * (high - low));
  return low + r;
}

function genRandomIDStr(low, high) {
  let base = 16;
  let randomID = genRandomID(low, high);
  return randomID.toString(base);
}

let tmpdir = os.tmpdir();

module.exports.genTemp = function (baseName) {
  let randomIDMax = 1024 * 1024;
  let randomIDStr = genRandomIDStr(0, randomIDMax);
  return path.join(tmpdir, `${baseName}-${randomIDStr}`);
};
