def print_json(name, version, pkg)
    esy_manifest = {
      "name" => name,
      "version" => version,
      "description" => "#{name} packaged for esy",
      "source" => "#{pkg.url}#sha256:#{pkg.sha256}",
      "override" => {
        "buildEnv" => {
          "PREFIX" => "$cur__install",
          "CC_PREFIX" => "\#{os == 'windows' ? 'x86_64-w64-mingw32-' : '' }"
        },
        "build" => pkg.system_args,
        "install" => "make install",
        "buildsInSource" => true,
        "exportedEnv" => {
          "PKG_CONFIG_PATH" => {
            "val" => "\#{self.lib / 'pkgconfig'}",
            "scope" => "global"
          }
        },
        "dependencies" => $formulas.keys().reduce({}) { |hash, k| hash["esy-#{k}"] = "*"; hash }
      }
  }

    puts JSON.pretty_generate(esy_manifest)
end
