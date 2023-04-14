export type path = string;
export type server = Object;
export type loginResponse = any;
export type addUserResponse = any;
export type email = string;
export type token = string;
export type url = string;
export type ProcessOutput = { stdout: string; stderr: string };
export type manifest = {
  source: string;
  name: string;
  version: string;
  description: string;
  override: {
    exportedEnv: Object;
    buildEnv: Object;
    build: string | Array<string>;
    install: string | Array<string>;
    buildsInSource: string | boolean;
    dependencies: Object;
  };
};
