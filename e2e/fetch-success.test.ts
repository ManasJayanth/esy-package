// @ts-nocheck
const Node = {
  fs: require("fs"),
  os: require("os"),
  path: require("path"),
  cp: require("child_process"),
};
import * as Utils from "./utils";
import { esyPackagePath, ESY_PACKAGE_CMD } from "./config";
import { commonSetup } from "./utils";

let testManifestFilename = "test-manifest.json";
let testProjectPath;

beforeAll(() => {
  // Clearing any previously created test fixtures
  const testProjectDir = "esy-package-fetch-success-test-area";
  testProjectPath = commonSetup(testProjectDir);
  Node.fs.copyFileSync(
    Node.path.join(__dirname, testManifestFilename),
    Node.path.join(testProjectPath, "esy.json"),
  );
});

test("End-to-end: success case: fetch sources for a valid manifest", () => {
  try {
    let stdout = Node.cp.execSync(`${ESY_PACKAGE_CMD} fetch`, {
      cwd: testProjectPath,
      env: { DEBUG: "bale*", ...process.env },
      stdio: "pipe",
    });
    expect(
      Node.fs
        .readdirSync(Node.path.join(testProjectPath, "_esy-package"))
        .join(" "),
    ).toContain("test-hello-c-0.1.0");
  } catch (e) {
    console.log(e);
    throw e;
  }
});
