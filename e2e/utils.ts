// @ts-nocheck
const Node = {
  path: require("path"),
  os: require("os"),
};
const { delimiter, normalize } = require("path");
const getPathKey = require("path-key");
const fse = require("fs-extra");
const rimraf = require("rimraf");

import { esyPackagePath } from "./config";

export function prependedPath(p) {
  let pathKey = getPathKey();
  return `${normalize(p)}${delimiter}${process.env[pathKey]}`;
}

export function commonSetup(testProjectDir) {
  let testProjectPath = Node.path.join(Node.os.tmpdir(), testProjectDir);
  rimraf.sync(testProjectPath);
  fse.mkdirpSync(testProjectPath);
  let pathKey = getPathKey();
  process.env[pathKey] = prependedPath(esyPackagePath);
  return testProjectPath;
}
