#! /bin/sh

# -------------- increment-npm-package-version.sh ------------ #
################################################################
# Needs: jq and semver					       #
#        brew install jq				       #
#        npm i -g semver				       #
# Usage: ./increment-npm-pkg-version.sh <path/to/package.json> #
################################################################

PACKAGE_JSON_PATH=$1
VERSION="$(jq -r .version $PACKAGE_JSON_PATH)"
NEXT_VERSION="$(semver -i prerelease $VERSION)"

jq ".version = \"$NEXT_VERSION\"" "$PACKAGE_JSON_PATH" > "$PACKAGE_JSON_PATH.tmp"
mv "$PACKAGE_JSON_PATH.tmp" "$PACKAGE_JSON_PATH"


rm -rf esy-package-0.1.0-dev.* && npm pack
npm i -g ./*.tgz
