const { download } = require("../utils");
import { genTemp } from "../../../test-utils/paths";
const path = require("path");
const fs = require("fs");

test("Must download a file correctly", async function () {
  let tmp = genTemp("download-success-test");
  let indexHTMLPath = path.join(tmp, "index.html");
  await download(
    "https://esy.sh#sha1:11f4a06342b45dbf9656cb7c2c11a48ee1055c6e",
    indexHTMLPath,
  );
  expect(fs.existsSync(indexHTMLPath)).toBe(true);
});
