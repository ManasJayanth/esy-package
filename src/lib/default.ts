import Path from "path";
import Os from "os";
import fs from "fs-extra";
import * as NpmServer from "../lib/npm-server";
import type { path } from "../types";
import * as Log from "../logger";
import * as Defaults from "./defaults";
import { esy, esyi, withPrefixPath } from "./esy";
import { packAndPublish } from "./shared";
import { withVerdaccioRunning, runTestProject } from "./esy-package";
import { withTemporaryTestProject } from "./utils";

export async function defaultCommand(
  pack: string,
  cwd: path,
  storagePath: path = Defaults.storagePath
) {
  return withTemporaryTestProject(async (testProjectPath) => {
    return withVerdaccioRunning(storagePath, async () => {
      try {
        await packAndPublish(pack, cwd, storagePath);
        Log.info("Running test project");
        fs.copySync("./esy-test", testProjectPath, { overwrite: true });
        await withPrefixPath(async (prefixPath) =>
          runTestProject(testProjectPath, prefixPath)
        );
        return 0;
      } catch (e) {
        Log.error(e.message);
        Log.error(e.stack);
        return -1;
      }
    });
  });
}
