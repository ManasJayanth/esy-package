import type { ProcessOutput } from "../types";
import Debug from "debug";

export const info = Debug("bale:info");
export const debug = Debug("bale:debug");
export const error = Debug("bale:error");

Debug.enable(
  ["bale:info,bale:error", global.process.env?.DEBUG || ""].join(","),
);

export function process(marker: string, output: ProcessOutput): void {
  const debugO = Debug(`bale:${marker}:stdout`);
  const debugE = Debug(`bale:${marker}:stderr`);
  let { stderr, stdout } = output;
  debugO(stdout);
  debugE(stderr);
}

export function raw(output: string): void {
  console.log(output);
}
