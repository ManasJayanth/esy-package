"use strict";
exports.__esModule = true;
var commander_1 = require("commander");
var version = require('./package.json').version;
var program = new commander_1.Command();
program
    .version(version)
    .action(function () {
    console.log("here");
});
program.parse(process.argv);
