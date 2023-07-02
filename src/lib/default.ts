import Path from "path";
import Os from "os";
import fs from "fs-extra";
import * as NpmServer from "../lib/npm-server";
import type { path } from "../types";
import * as Log from "../logger";
import * as Defaults from "./defaults";
import { esy, esyi, withPrefixPath } from "./esy";
import { packAndPublish } from "./shared";
import { withVerdaccioRunning } from "./esy-package";

export async function defaultCommand(
  pack: string,
  cwd: path,
  storagePath: path = Defaults.storagePath
) {
  await withVerdaccioRunning(storagePath, () => {
    try {
      await packAndPublish(pack, cwd, storagePath);
      Log.info("Running test project");
      let testProjectPath = Path.join(Os.tmpdir(), "esy-test");
      Log.info("Clearing path meant for test project", testProjectPath);
      await fs.remove(testProjectPath);
      fs.copySync("./esy-test", testProjectPath, { overwrite: true });
      await withPrefixPath(async (prefixPath) => {
        Log.info("Running esy install");
        Log.process(
          "esy-install",
          await esyi({ cwd: testProjectPath, prefixPath })
        );
        Log.info("Running esy");
        await esy({ cwd: testProjectPath, prefixPath });
      });
      return 0;
    } catch (e) {
      Log.error(e.message);
      Log.error(e.stack);
      return -1;
    }
  });
}
