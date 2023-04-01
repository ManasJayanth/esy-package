import { Command } from 'commander';
const version = require('./package.json').version;

const program = new Command();
program
    .version(version)
    .action(() => {
	console.log("here");
    });

program.parse(process.argv);
