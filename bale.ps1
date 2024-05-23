#!/usr/bin/env pwsh
$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent

[System.Collections.ArrayList]$nodeArgs = @()

if ($env:NODE_ENV -eq  "development") {
    $nodeArgs += "--enable-source-maps";
}

$exe=""
if ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {
  # Fix case when both the Windows and Linux builds of Node
  # are installed in the same directory
  $exe=".exe"
}
# Support pipeline input
if ($MyInvocation.ExpectingInput) {
  $input | & node $nodeArgs "$basedir/js/bin/main.js" $args
} else {
  & node $nodeArgs "$basedir/js/bin/main.js" $args
}
exit $LASTEXITCODE
