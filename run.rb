
require "/Users/manas/development/prometheansacrifice/bale/etc/language.rb" 
require "/Users/manas/development/prometheansacrifice/bale/etc/formula.rb" 
require "/opt/homebrew/Library/Taps/homebrew/homebrew-core/Formula/a/attr.rb"
require "/Users/manas/development/prometheansacrifice/bale/etc/print.rb"

name = "esy-attr"
version = "0.1.0"
pkg = Attr.new
pkg.install
print_json(name, version, pkg)
