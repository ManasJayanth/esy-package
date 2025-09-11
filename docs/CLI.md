CLI Usage

This project provides the `bale` CLI to help you fetch sources, package an esy recipe for NPM, run end-to-end tests against a local registry, generate bootstrap manifests, and drop into a debug shell.

Prerequisites

- Node.js 16+ and npm
- On macOS: Homebrew and Ruby (for the generator that reads Homebrew formulae)
- Optional: `esy` installed globally if you plan to run the e2e flow

Basic Commands

- `bale fetch`:
  - Reads `esy.json` in `--cwd` (default: current dir), downloads the `source` archive, verifies checksum, and prints the relative extracted path.

- `bale package`:
  - Packages the manifest at `--cwd` (default: current dir) into an NPM-packable folder under `_esy-package/<name>` and produces `package.tar.gz` there.

- `bale` (default command):
  - Publishes the package from `--cwd` to a local Verdaccio registry and runs an end-to-end test project from `esy-test/` if present (or generates a minimal consumer).
  - Options:
    - `-i, --prefix-path <path>`: Esy cache/prefix to use
    - `-s, --storage-path <path>`: Verdaccio storage path
    - `-r, --registry-log-level <level>`: Verdaccio log level
    - `-p, --pack "cmd1 && cmd2"`: Override packaging commands

- `bale shell`:
  - Same as default flow but drops into an interactive shell inside the end-to-end project to debug build issues.

- `bale generate <package>`:
  - Attempts to generate `esy.json` under `esy-dependencies/<package>/` using Homebrew formula information for quick bootstrapping.

Environment

- `DEBUG=bale*` enables detailed logs across subcomponents.

Example: Package Neovim for esy

1) Generate a starter manifest (macOS/Homebrew):

   bale generate neovim

   This creates `esy-dependencies/neovim/esy.json`. Review and update fields as needed.

2) Set the source tarball and checksum in the generated manifest. For example, Neovim v0.10.2:

   "source": "https://github.com/neovim/neovim/archive/refs/tags/v0.10.2.tar.gz#sha256:546cb2da9fffbb7e913261344bbf4cf1622721f6c5a67aa77609e976e78b8e89"

   Note: The generator stubs build steps and deps based on Homebrew; you may need to adjust paths across platforms (e.g., `.so` vs `.dylib`) and fine-tune `override.build`/`exportedEnv`.

3) Fetch sources to validate:

   cd esy-dependencies/neovim
   DEBUG=bale* bale fetch

   This prints the relative extraction path under `_esy-package`.

4) Create the NPM packable artifact:

   bale package

   Result: `_esy-package/package.tar.gz` and a packable folder `_esy-package/<name>`.

5) Optional: Run the default end-to-end flow:

   - If you have a consumer project under `esy-test/`, `bale` will publish the package to a temporary local registry and run `esy install` + `esy` inside that project.

   DEBUG=bale* bale

   - Or drop into a shell for debugging:

   DEBUG=bale* bale shell

Tips

- If `bale generate` fails for some dependencies, the main manifest may still be created. You can iteratively refine manifests inside `esy-dependencies/`.
- Windows-specific: the tool includes robustness for archive handling (retries and temp-file extraction). If you see transient ENOENT/EPERM issues in CI, re-run; they should recover.
