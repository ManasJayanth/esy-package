import * as profile from "npm-profile";
import type { email, token, loginResponse, addUserResponse } from "../types";
import { REGISTRY_URL } from "../config";

let localRegistryOpts = {
  registry: REGISTRY_URL,
};

async function handleLoginOrAdduser(
  username: string,
  npmResponse: loginResponse | addUserResponse
): Promise<token> {
  let { ok, token, username: userNameFromResponse } = npmResponse;
  if (
    ok !== `you are authenticated as '${userNameFromResponse}'` &&
    typeof token === "string" &&
    token !== "" &&
    username === userNameFromResponse
  ) {
    throw new Error(
      "Login failed because registry server sent unrecogised response " +
        JSON.stringify(npmResponse)
    );
  }
  return token;
}

// We write login and adduser by hand, because npm login doesn't provide a way to pass username creds easily
export async function login(
  username: string,
  password: string
): Promise<token> {
  let npmResponse = await profile.loginCouch(
    username,
    password,
    localRegistryOpts
  );
  return handleLoginOrAdduser(username, npmResponse);
}

export async function addUser(
  username: string,
  email: email,
  password: string
): Promise<token> {
  let npmResponse = await profile.adduserCouch(
    username,
    email,
    password,
    localRegistryOpts
  );
  return handleLoginOrAdduser(username, npmResponse);
}
