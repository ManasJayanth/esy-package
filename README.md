> ⚠️ Work in Progress

A tool to make it easier to package C libraries and tools for [esy](esy.sh)

Note: On Windows, it works only within mingw/GitBash environment (but not cygwin) since esy provides this environment anyway.

Needs Powershell 7

## Development

(Currently Windows only) Set `NODE_ENV` to `development` to enable sourcemaps at the node wrapper. Not useful inside the JS realm.

You'll need MSYS - Set $env:PATH to `$env:PATH = "C:\msys64\usr\bin;" + $env:PATH`. GitBash support is unreliable. MSYS is more reliable.
