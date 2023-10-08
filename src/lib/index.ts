import * as cp from "child_process";
import Debug from "debug";
import * as path from "path";
import * as os from "os";
import * as url from "url";
import * as fs from "fs";
import { mkdirpSync, fetch, copy } from "./utils";
import * as Npm from "./npm-session";
import * as NpmClient from "./npm-client";
import { REGISTRY_HOST, localNpmRc } from "../config";
import * as EsyPackage from "./esy-package";
import * as Defaults from "./defaults";

const debug = Debug("bale:package:info");

function filterComments(o = {}) {
  return Object.keys(o)
    .filter((k) => !k.startsWith("//"))
    .reduce((acc, k) => {
      acc[k] = o[k];
      return acc;
    }, {});
}

export * from "./npm-session";

export async function createSession(): Promise<string> {
  let token: string;
  let testUsername = "foo"; // TODO centralise this
  let testEmail = "foo@bar.com"; // TODO centralise this
  let testPassword = "bar"; // TODO centralise this
  try {
    debug("Attempting npm login");
    token = await Npm.login(testUsername, testPassword);
  } catch (_) {
    debug("NPM login failed. Attempting adduser");
    token = await Npm.addUser(testUsername, testEmail, testPassword);
  }
  // // Writing to .npmrc by hand. See docs/notes.org to see why
  fs.appendFileSync(localNpmRc, `//${REGISTRY_HOST}/:_authToken="${token}"\n`);
  return token;
}
