// @ts-nocheck
const Node = {
  fs: require("fs"),
  os: require("os"),
  path: require("path"),
  cp: require("child_process"),
};
const fse = require("fs-extra");
const rimraf = require("rimraf");
const { delimiter, normalize } = require("path");
const getPathKey = require("path-key");

let pathKey = getPathKey();
let esyPackagePath = Node.path.resolve(__dirname, "..");
process.env[pathKey] = `${normalize(esyPackagePath)}${delimiter}${process.env[pathKey]}`;

const ESY_PACKAGE_PATH = "bale";
let testProjectPath = Node.path.join(
  Node.os.tmpdir(),
  "esy-package-e2e-test-area"
);
let testManifestFilename = "test-manifest.json";
let esyTestJson = "esy-test.json";
let esyTestPath = Node.path.join(testProjectPath, "esy-test");

beforeAll(() => {
  rimraf.sync(testProjectPath);
  fse.mkdirpSync(testProjectPath);
  Node.fs.copyFileSync(
    Node.path.join(__dirname, testManifestFilename),
    Node.path.join(testProjectPath, "esy.json")
  );
  fse.mkdirpSync(esyTestPath);
  Node.fs.copyFileSync(
    Node.path.join(__dirname, esyTestJson),
    Node.path.join(esyTestPath, "esy.json")
  );
});

test("End-to-end: success case: a project for which esy-package should finish running successfullly", () => {
  try {
    Node.cp.execSync(`${ESY_PACKAGE_PATH}`, {
      cwd: testProjectPath,
      env: { DEBUG: "bale*", ...process.env },
    });
  } catch (e) {
    console.log(e.stdout.toString());
    console.log(e.stderr.toString());
    throw e;
  }
});
