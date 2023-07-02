import type { path } from "../types";
import * as EsyPackage from "./esy-package";
import * as Defaults from "./defaults";

export async function buildShell(
  cwd: path,
  storagePath: path = Defaults.storagePath,
  pack: string
): Promise<number> {
  await EsyPackage.buildShell(cwd, storagePath, pack);
  return 0;
}
