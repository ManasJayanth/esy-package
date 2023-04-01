#! /bin/sh

increment-npm-pkg-version.sh $PWD/package.json
rm bale-0.1.0-dev.* && npm pack 
npm i -g ./*.tgz
