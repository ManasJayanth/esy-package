import type { path } from "../types";
import * as EsyPackage from "./esy-package";

export async function buildShell(cwd: path): Promise<number> {
  await EsyPackage.buildShell(cwd);
  return 0;
}
