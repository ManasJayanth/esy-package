import * as fs from "fs";
import * as cp from "child_process";
import * as nodePath from "path";
import * as EsyPackage from "./esy-package";
import * as Log from "../logger";
import type { path } from "../types";
import * as os from "os";

const Node = { path: nodePath };

export async function patch(cwd: path): Promise<void> {
  let pkgPath = await EsyPackage.fetch(cwd);
  let manifest = require(Node.path.join(cwd, "esy.json"));
  let { name } = manifest;
  try {
    cp.execSync("git init --initial-branch main", { cwd: pkgPath });
    cp.execSync("git add .", { cwd: pkgPath });
    fs.appendFileSync(
      Node.path.join(pkgPath, ".git", "config"),
      `
[user]
	name = foo
	email = foo@bar.com
`
    );
    cp.execSync("git commit -m 'Initial commit'", { cwd: pkgPath });
    let tmpRcFilePath = Node.path.join(os.tmpdir(), "tmp-rc-file");
    let tmpRcFileContents = `export PS1="[build ${name}] % ";
`;
    fs.writeFileSync(tmpRcFilePath, tmpRcFileContents);
    Log.info(tmpRcFilePath);
    cp.execSync(`bash --noprofile --rcfile ${tmpRcFilePath}`, {
      stdio: "inherit",
    });
    cp.execSync("git add .", { cwd: pkgPath });
    cp.execSync("git commit -m 'TODO'", { cwd: pkgPath });
    cp.execSync("git format-patch -1", { cwd: pkgPath });
  } catch (e) {
    console.log(e.stdout.toString());
    console.log(e.stderr.toString());
  }
}
