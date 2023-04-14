import { Command } from "commander";
import * as commandDefs from "../lib/commands";

const version = require("../../package.json").version;

const program = new Command();

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
    await commandDefs.defaultCommand(pack, cwd);
  });

program
  .command("package")
  .description(
    "Packages a given esy.json manifest (and patches if any) for NPM. It will create a npm 'packable' folder in _esy-package/<package-name>"
  )
  .action(async () => {
    const { cwd = process.cwd() } = program.opts();
    await commandDefs.pkg(cwd);
  });

program
  .command("fetch")
  .description("Given an esy.json manifest, it will fetch the archive (tar, zip etc), extract it, and echo the path where sources have been extracted")
  .action(async () => {
    const { cwd = process.cwd() } = program.opts();
    await commandDefs.fetch(cwd);
  });

program.parse(process.argv);
