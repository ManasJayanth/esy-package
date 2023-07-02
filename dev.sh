#! /bin/sh

increment-npm-pkg-version.sh $PWD/package.json
rm esy-package-0.1.0-dev.* ; npm pack
npm publish --tag dev
