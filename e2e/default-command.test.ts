// @ts-nocheck
const Node = {
  fs: require("fs"),
  path: require("path"),
  cp: require("child_process"),
};
const fse = require("fs-extra");
const rimraf = require("rimraf");
import { ESY_PACKAGE_CMD, esyPackagePath } from "./config";
import { commonSetup } from "./utils";

export let testManifestFilename = "test-manifest.json";
export let esyTestJson = "esy-test.json";
export let esyTestDir = "esy-test";

let testProjectPath;

beforeAll(() => {
  /////////////////////////////////////////////////////////////////////////////////////////
  // We have to setup,									 //
  // 1. a manifest packaging the dummy c package, `hello`, creating `esy-hello` package. //
  // 2. a manifest consuming the newly created `esy-hello` package			 //
  /////////////////////////////////////////////////////////////////////////////////////////

  // Clearing any previously created test fixtures
  const testProjectDir = "esy-package-e2e-test-area";
  testProjectPath = commonSetup(testProjectDir);

  // Copying the manifest for esy-hello
  Node.fs.copyFileSync(
    Node.path.join(__dirname, testManifestFilename),
    Node.path.join(testProjectPath, "esy.json"),
  );

  // Copying the manifest for esy-test/package.json
  let esyTestPath = Node.path.join(testProjectPath, "esy-test");
  fse.mkdirpSync(esyTestPath);
  Node.fs.copyFileSync(
    Node.path.join(__dirname, esyTestJson),
    Node.path.join(esyTestPath, "esy.json"),
  );
});

test.skip("End-to-end: success case: a project for which esy-package should finish running successfullly", () => {
  try {
    Node.cp.execSync(`${ESY_PACKAGE_CMD}`, {
      cwd: testProjectPath,
      env: { ...process.env, DEBUG: "bale*" },
    });
  } catch (e) {
    console.log(e.stdout.toString());
    console.log(e.stderr.toString());
    throw e;
  }
});

test("End-to-end: success case: fetch sources for a valid manifest", () => {
  try {
    let stdout = Node.cp.execSync(`${ESY_PACKAGE_CMD} fetch`, {
      cwd: testProjectPath,
      env: { DEBUG: "bale*", ...process.env },
      stdio: "pipe",
    });
    expect(stdout.toString()).toContain(
      Node.path.join("_esy-package", "test-hello-c-0.1.0"),
    );
  } catch (e) {
    console.log(e);
    throw e;
  }
});
