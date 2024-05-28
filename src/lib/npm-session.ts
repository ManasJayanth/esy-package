import * as profile from "npm-profile";
import type { email, token, loginResponse, addUserResponse } from "../types";

async function handleLoginOrAdduser(
  username: string,
  npmResponse: loginResponse | addUserResponse,
): Promise<token> {
  let { ok, token, username: userNameFromResponse } = npmResponse;
  if (
    (ok !== `you are authenticated as '${userNameFromResponse}'` &&
      ok !== `user '${userNameFromResponse}' created`) ||
    token === "" ||
    username !== userNameFromResponse
  ) {
    throw new Error(
      "Login failed because registry server sent unrecogised response " +
        JSON.stringify(npmResponse),
    );
  }
  return token;
}

// We write login and adduser by hand, because npm login doesn't provide a way to pass username creds easily
export async function login(
  username: string,
  password: string,
  registryUrl: string,
): Promise<token> {
  let localRegistryOpts = {
    registry: registryUrl,
  };
  let npmResponse = await profile.loginCouch(
    username,
    password,
    localRegistryOpts,
  );
  return handleLoginOrAdduser(username, npmResponse);
}

export async function addUser(
  username: string,
  email: email,
  password: string,
  registryUrl: string,
): Promise<token> {
  let localRegistryOpts = {
    registry: registryUrl,
  };
  let npmResponse = await profile.adduserCouch(
    username,
    email,
    password,
    localRegistryOpts,
  );
  return handleLoginOrAdduser(username, npmResponse);
}
