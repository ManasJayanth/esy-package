const { download } = require("../utils");
import { genTemp } from "../../../test-utils/paths";
const path = require("path");
const fs = require("fs");

test("Must download a file correctly", async function () {
  let tmp = genTemp("download-success-test");
  let tarballPath = path.join(tmp, "tarball");
  await download(
    "https://github.com/esy/test-hello-c/archive/refs/tags/0.1.0.tar.gz#b347c1eb3db9a55ad9cee916d5ca16a104843b45",
    tarballPath,
  );
  expect(fs.existsSync(tarballPath)).toBe(true);
});
