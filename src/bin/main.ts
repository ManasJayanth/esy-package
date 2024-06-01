import { Command } from "commander";
import { defaultCommand, shellCommand, pkg, fetch } from "../lib";

const version = require("../../package.json").version;

function globalErrorHandler(e) {
  if (e.errno === -3008 /* ENOTFOUND */ || e.errno === -3001 /* EAI_AGAIN */) {
    console.log("Could not find the source URL");
  } else {
    console.log(e);
  }
  process.exit(-1);
}

function commonOptions(program: Command) {
  return program.option("-C, --cwd [cwd]", "Set current working directory");
}

const program = new Command();

program.version(version);

commonOptions(program)
  .option(
    "-r, --registry-log-level [level]",
    "To configure log level from test verdaccio server. Ref: https://verdaccio.org/docs/logger/#configuration",
  )
  .option(
    "-i, --prefix-path [path]",
    "Path that esy can use for cache area as it runs the tests",
  )
  .option(
    "-s, --storage-path [path]",
    "Path that verdaccio can use for storage as it runs the tests",
  )
  .option(
    "-p, --pack [packingCommands]",
    "Specify sequence of commands, separated by &&, to package for NPM",
  )
  .action(async () => {
    const {
      pack,
      cwd = process.cwd(),
      storagePath,
      prefixPath,
      registryLogLevel,
    } = program.opts();
    await defaultCommand(
      pack,
      cwd,
      storagePath,
      prefixPath,
      registryLogLevel,
    ).catch(globalErrorHandler);
  });

program
  .command("package")
  .description(
    "Packages a given esy.json manifest (and patches if any) for NPM. It will create a npm 'packable' folder in _esy-package/<package-name>",
  )
  .action(async () => {
    const { cwd = process.cwd() } = program.opts();
    await pkg(cwd).catch(globalErrorHandler);
  });

commonOptions(program.command("fetch"))
  .description(
    "Given an esy.json manifest, it will fetch the archive (tar, zip etc), extract it, and echo the path where sources have been extracted",
  )
  .action(async () => {
    const { cwd = process.cwd() } = program.opts();
    await fetch(cwd).catch(globalErrorHandler);
  });

commonOptions(program.command("shell"))
  .option(
    "-r, --registry-log-level",
    "Flag to turn on logs from test verdaccio server",
  )
  .description(
    "Given an esy.json manifest, and an test folder containing test project using the package, it drops you into a shell to debug the package build",
  )
  .option(
    "-i, --prefix-path [path]",
    "Path that esy can use for cache area as it runs the tests",
  )
  .option(
    "-s, --storage-path [path]",
    "Path that verdaccio can use for storage as it runs the tests",
  )
  .option(
    "-p, --pack [packingCommands]",
    "Specify sequence of commands, separated by &&, to package for NPM",
  )
  .action(async () => {
    const {
      pack,
      cwd = process.cwd(),
      storagePath,
      prefixPath,
      registryLogLevel,
    } = program.opts();
    await shellCommand(
      pack,
      cwd,
      storagePath,
      prefixPath,
      registryLogLevel,
    ).catch(globalErrorHandler);
  });

program.parse(process.argv);
