const NpmLogin = require("./npm-session");
const profile = require("npm-profile");

profile.loginCouch = jest
  .fn()
  .mockImplementation((username, password, _opts) => {
    // we assume a user with username foo and with password bar exists
    if (username === "foo" && password === "bar") {
      return Promise.resolve({
        ok: "you are authenticated as 'foo'",
        token: "DJiOPYlKAXumiuonncP6+Q==",
        username,
      });
    } else {
      return Promise.reject(
        new Error("Type of this error doesn't matter as we disregard it")
      );
    }
  });

test("npm login: right credentials", () => {
  // we expect it to not throw
  let username = "foo";
  let password = "bar";
  NpmLogin.login(username, password);
});

test("npm login: wrong credentials", () => {
  expect(async () => NpmLogin.login("foo", "foo")).rejects.toThrow();
});
