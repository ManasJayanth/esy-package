require 'json'

def ENV.deparallelize
  # After the block returns, you'd restore any environment state changes if necessary.
end

def ENV.cxx11(*args)
end


class Version
  def initialize(*args)
    @version = ""
  end

  def minor()
    ""
  end
  def major()
    ""
  end
  def major_minor()
    ""
  end
end
class PlaceholderPath
  def initialize(path = "")
    @path = path
  end

  def children(*args)
  end
  def self.children(*args)
  end
  def /(subpath)
    PlaceholderPath.new(File.join(@path, subpath))
  end
  def write(*args)
  end
  def install_symlink(*args)
  end
  def install(*args)
  end
  def mkpath
  end
  def rmtree(*args)
  end
  def to_s
    @path
  end
end

class OS
  def self.linux?(*args)
    false
  end
  def self.mac?
    # TODO
    false
  end
end

class FormulaStub
  def initialize(name)
    @name = name
  end
  def prefix(*args)
    PlaceholderPath.new("\#{#{@name}.install}")
  end
  def opt_bin(*args)
    PlaceholderPath.new("\#{#{@name}.bin}")
  end
  def opt_prefix
    "\#{#{@name}.install}"
  end
end

class Build
  def head?(*args)
    false
  end
  def stable?(*args)
    true
  end
end

class Tap
  def name
    ""
  end
  def user
    ""
  end
end

$formulas ||= {}

class Formula
  attr_accessor :desc, :homepage, :url, :version, :mirror, :sha256, :license, :depends_on, :uses_from_macos

  def self.inherited(subclass)
    subclass.instance_eval do
      @desc = nil
      @homepage = nil
      @url = nil
      @version = Version.new("")
      @mirror = []
      @sha256 = nil
      @license = nil
      @depends_on = []
      @uses_from_macos = []
      @prefix = PlaceholderPath.new('#{self.install}')
      @buildpath = PlaceholderPath.new('#{self.target}')
      @pkgshare = PlaceholderPath.new('#{self.share}')
      @share = PlaceholderPath.new('#{self.share}')
    end
  end

  def self.[] (name)
    $formulas[name]
  end

  def self.add_formula(name, formula)
    $formulas ||= {}
    $formulas[name] = formula
  end

  
  def build
    @build ||= Build.new
  end
  
  def self.desc(description)
    @desc = description
  end

  def self.version(v)
    @version = v
  end

  def self.homepage(url)
    @homepage = url
  end

  def self.url(url)
    @url = url
  end

  def self.mirror(url)
    @mirror << url
  end

  def self.sha256(hash)
    @sha256 = hash
  end

  def self.license(license)
    @license = license
  end

  def self.prefix(prefix)
    @prefix = prefix
  end

  def self.head(*args)
  end

  def self.livecheck()
  end

  def self.bottle()
  end

  def self.test(*args)
  end

  def self.depends_on(dependency)
    if dependency.class.name == 'String' then
      dep = dependency
    else
      dep = dependency.keys()[0]
    end
    @depends_on << dependency
    deps_array = dep.split('@');
    self.add_formula(dep, FormulaStub.new(deps_array[0]))
    self.add_formula(dep, FormulaStub.new(dependency))
  end

  def self.uses_from_macos(dependency, *unused)
    @uses_from_macos << dependency
    self.add_formula(dependency, FormulaStub.new(dependency))
  end


  def self.bash_completion
    share/"bash_completion/completions"
  end

  def self.zsh_completion
    share/"zsh/site-functions"
  end

  def tap
    Tap.new
  end
  def name
    '#{self.name}'
  end
  def desc
    self.class.instance_variable_get(:@desc)
  end

  def version
    self.class.instance_variable_get(:@version)
  end

  def homepage
    self.class.instance_variable_get(:@homepage)
  end

  def url
    self.class.instance_variable_get(:@url)
  end

  def prefix
    self.class.instance_variable_get(:@prefix)
  end

  def mirror
    self.class.instance_variable_get(:@mirror)
  end

  def sha256
    self.class.instance_variable_get(:@sha256)
  end

  def license
    self.class.instance_variable_get(:@license)
  end

  def depends_on
    self.class.instance_variable_get(:@depends_on)
  end

  def uses_from_macos
    self.class.instance_variable_get(:@uses_from_macos)
  end

  def head
    self.class.instance_variable_get(:@head)
  end

  def system(*args)
    @system_args ||= [[]]
    @system_args << args
  end

  def system_args
    @system_args
  end

  def std_configure_args
    @system_args
  end
  def std_cmake_args
    @system_args
  end
  def std_meson_args
    @system_args
  end
  def bash_completion
    @bash_completion ||= PlaceholderPath.new
  end

  def zsh_completion
    @zsh_completion ||= PlaceholderPath.new
  end

  def buildpath
    self.class.instance_variable_get(:@buildpath)
  end

  def share
    PlaceholderPath.new('#{self.share}')
  end

  def pkgshare
    PlaceholderPath.new('#{self.share}')
  end

  def inreplace(*unused)
    ""
  end

  def self.patch(url: nil, sha256: nil, &block)
    # If a block is given, you could call it or handle it as needed
    block.call if block
  end
  def libexec
    PlaceholderPath.new('#{self.lib}')
  end
  def lib
    PlaceholderPath.new('#{self.lib}')
  end
  def var
    PlaceholderPath.new('#{self.var}')
  end
  def etc
    PlaceholderPath.new('#{self.etc}')
  end
  def opt_bin(*args)
    PlaceholderPath.new('#{self.bin}')
  end
  def opt_prefix
    PlaceholderPath.new('#{self.install}')
  end
  def bin
    PlaceholderPath.new('#{self.bin}')
  end
  def man
    PlaceholderPath.new('#{self.man}')
  end
  def man1
    PlaceholderPath.new('#{self.man1}')
  end
  def doc
    PlaceholderPath.new('#{self.doc}')
  end
  def elisp
    PlaceholderPath.new('#{self.etc}')
  end
  def self.revision(_rev=nil)
    ""
  end
  def self.pour_bottle?(_rev=nil)
    false
  end
  def self.on_linux(*args)
    false
  end
  def self.skip_clean(*args)
    false
  end
  def self.resource(*args)
    false
  end
  def self.link_overwrite(*args)
    false
  end
  def deparallelize(*args)
    # This method is meant to disable parallel build processes.
    # Since we're implementing a no-op version, there's nothing to do here.
  end
  def self.framework(*args)
    ""
  end
  def self.on_macos(&block)
    block.call
  end
  def on_macos(&block)
    block.call
  end
  def self.on_linux(&block)
    block.call
  end
  def on_linux(&block)
    block.call
  end
  def self.macros(*args) # util-macros
  end
  def self.keg_only(*args)
  end
  def rm_rf(*args)
  end
  def self.rm_rf(*args)
  end
  def rm_r(*args)
  end
  def self.rm_r(*args)
  end
  def rm(*args)
  end
  def self.rm(*args)
  end
  def mkpath(*args)
  end
  def self.mkpath(*args)
  end
  def touch(*args)
  end
  def self.touch(*args)
  end
  def mkdir(*args)
  end
  def self.mkdir(*args)
  end
  def conflicts_with(*args)
  end
  def self.conflicts_with(*args)
  end
  def cd(*args)
  end
  def self.cd(*args)
  end
  def detected_python_shebang(*args)
  end
  def self.detected_python_shebang(*args)
  end
  def rewrite_shebang(*args)
  end
  def self.rewrite_shebang(*args)
  end
  def service(*args)
  end
  def self.service(*args)
  end
  def stable(*args)
  end
  def self.stable(*args)
  end
  def self.resources(*args)
  end
  def resources(*args)
  end
  def fails_with(*args)
  end
  def self.fails_with(*args)
  end
end

unless defined?(HOMEBREW_PREFIX)
  HOMEBREW_PREFIX = "/path/to/your/homebrew/installation"
end
unless defined?(Util)
  Util = "not-sure-what-util-is"
end
module Pathname
  def self.glob(*args)
  end
end
module Hardware
  class CPU
    def self.arm?
      false
    end
  end
end
