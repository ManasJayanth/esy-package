import { Command } from "commander";
import * as commandDefs from "../lib/commands";

const version = require("../../package.json").version;

function globalErrorHandler(e) {
  if (e.errno === -3008 /* ENOTFOUND */ || e.errno === -3001 /* EAI_AGAIN */) {
    console.log("Could not find the source URL");
  } else {
    console.log(e.message);
    if (e.stdout) {
      console.log(e.stdout.toString());
    }
    if (e.stderr) {
      console.log(e.stderr.toString());
    }
  }
  process.exit(-1);
}

const program = new Command();

type command = (a: void) => Promise<number>;

async function runCommand(f: command): Promise<void> {
  return f().then(process.exit).catch(globalErrorHandler);
}

program.version(version);

program
  .option("-C, --cwd [cwd]", "Set current working directory")
  .option(
    "-s, --storage-path [path]",
    "Path that verdaccio can use for storage as it runs the tests"
  )
  .option(
    "-p, --pack [packingCommands]",
    "Specify sequence of commands, separated by &&, to package for NPM"
  )
  .action(async () => {
    const { pack, cwd = process.cwd() } = program.opts();
    await runCommand(() => commandDefs.defaultCommand(pack, cwd));
  });

program
  .command("package")
  .description(
    "Packages a given esy.json manifest (and patches if any) for NPM. It will create a npm 'packable' folder in _esy-package/<package-name>"
  )
  .action(async () => {
    const { cwd = process.cwd() } = program.opts();
    await runCommand(() => commandDefs.pkg(cwd));
  });

program
  .command("fetch")
  .option("-C, --cwd [cwd]", "Set current working directory")
  .description(
    "Given an esy.json manifest, it will fetch the archive (tar, zip etc), extract it, and echo the path where sources have been extracted"
  )
  .action(async () => {
    const { cwd = process.cwd() } = program.opts();
    await runCommand(() => commandDefs.fetch(cwd));
  });

program
  .command("build-shell")
  .option("-C, --cwd [cwd]", "Set current working directory")
  .description(
    "Given an esy.json manifest, it will build and publish the package to a local verdaccio and create a esy build-shell to debug"
  )
  .action(async () => {
    const { cwd = process.cwd() } = program.opts();
    await runCommand(() => commandDefs.buildShell(cwd));
  });

program.parse(process.argv);
