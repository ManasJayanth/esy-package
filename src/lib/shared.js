import * as cp from "child_process";
import * as Bale from "../lib";
import * as NpmClient from "../lib/npm-client";

import { REGISTRY_ADDR, REGISTRY_PORT, REGISTRY_URL } from "../config";

export async function packAndPublish(
  pack: string,
  cwd: path,
  storagePath: path = Defaults.storagePath
) {
  Log.info("Setting up");
  Log.info("Clearing storage path meant for verdaccio", storagePath);
  rimraf.sync(storagePath);
  fse.mkdirp(storagePath);
  let server: any;
  Log.info("Initialising verdaccio server");
  server = await NpmServer.init(
    "/unnecessary-path.yml",
    storagePath,
    REGISTRY_ADDR,
    REGISTRY_PORT
  );
  await NpmServer.start(server);
  Log.info("Setting up verdaccio user session");
  await Bale.createSession();
  Log.info("Packaging");
  if (pack) {
    pack
      .split("&&")
      .map((s) => s.trim())
      .forEach((command) => {
        cp.execSync(command);
      });
  } else {
    await Bale.pack(cwd);
  }
  Log.info("Verdaccio registry started");
  let tarballPath = `${cwd}/package.tar.gz`;
  Log.process("verdaccio", await NpmClient.publish(REGISTRY_URL, tarballPath));
  return 0;
}
