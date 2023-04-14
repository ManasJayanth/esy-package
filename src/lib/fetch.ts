import type { path } from "../types";
import * as Log from "../logger";
import * as EsyPackage from "./esy-package";

export async function fetch(cwd: path): Promise<void> {
  let pkgPath = await EsyPackage.fetch(cwd);
  Log.raw(pkgPath);
}
