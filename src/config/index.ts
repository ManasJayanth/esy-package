export let localNpmRc = `${process.platform === 'win32' ? process.env.USERPROFILE: process.env.HOME}/.npmrc`; // TODO centralise this
export let REGISTRY_ADDR = "localhost";
export let REGISTRY_PORT = 6000;
export let REGISTRY_HOST = `${REGISTRY_ADDR}:${REGISTRY_PORT}`;
export let REGISTRY_URL = `http://${REGISTRY_HOST}`;
