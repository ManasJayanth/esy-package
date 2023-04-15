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

let testManifestFilename = "non-existent-source-url-manifest.json";
let testProjectPath;

beforeAll(() => {
  // Clearing any previously created test fixtures
  const testProjectDir = "esy-package-fetch-failure-test-area";
  testProjectPath = commonSetup(testProjectDir);
  Node.fs.copyFileSync(
    Node.path.join(__dirname, testManifestFilename),
    Node.path.join(testProjectPath, "esy.json")
  );
});


test("End-to-end: failure case 1: trying to fetch sources for a valid manifest but with non-existent URL", () => {
  try {
    let stdout = Node.cp.execSync(`${ESY_PACKAGE_CMD} fetch`, {
      cwd: testProjectPath,
      env: { DEBUG: "bale*", ...process.env },
      stdio: 'pipe'
    });
    throw new Error("Should have thrown");
  } catch (e) {
    expect(e.stdout.toString()).toContain("Could not find the source URL");
  }
});
