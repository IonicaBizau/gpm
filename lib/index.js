// Dependencies
const gitSource = require("git-source")
    , packageJson = require("package-json")
    , ul = require("ul")
    , gry = require("gry")
    , tmp = require("tmp")
    , oArgv = require("oargv")
    , rJson = require("r-json")
    , mkdirp = require("mkdirp")
    , oneByOne = require("one-by-one")
    , sameTime = require("same-time")
    , ExecLimiter = require("exec-limiter")
    , deffy = require("deffy")
    , path = require("path")
    ;

// Constants
const DEFAULT_PACK = {
    repository: {}
  , scripts: {}
  , dependencies: {}
};

// Create the exec limiter
var el = new ExecLimiter(deffy(+process.env.GPM_PROCESS_COUT_LIMIT, 100));

/**
 * Gpm
 * Creates a new `Gpm` instance.
 *
 * @name Gpm
 * @function
 * @param {String|Object} package The git url, the npm package name or a package.json-like object.
 * @param {Object} options An object containing the following fields:
 *
 *  - `url_type` (String): A value interpreted by `git-url-parse` (default: `"ssh"`).
 *  - `dest` (String): The destination path (defaults to `process.cwd()`).
 *  - `auto` (Boolean): If `true`, a new directory will be created in the destination directory (default: `true`).
 *  - `is_dev` (Boolean): If `true`, the dev dependencies will be installed as well (default: `false`).
 *  - `depth` (Number): The dependency tree depth (the other dependencies being installed via `npm`). Default is `Infinity`.
 *
 * @return {Gpm} The `Gpm` instance.
 */
function Gpm(package, options) {

    options = ul.merge(options, {
        url_type: "ssh"
      , dest: process.cwd()
      , auto: true
      , is_dev: false
      , depth: Infinity
    });

    this.package = package;
    this.path = options.dest;
    this.auto = options.auto;
    this.url_type = options.url_type;
    this.is_dev = options.is_dev;
    this.depth = options.depth;
}

/**
 * getPack
 * Gets the module `package.json` object.
 *
 * @name getPack
 * @function
 * @param {Function} callback The callback function.
 */
Gpm.prototype.getPack = function (callback) {
    var self = this
      , parsed = self.url_parsed
      ;

    if (!self.is_git) {
        PackageJson(self.input, "latest", function (err, res) {
            if (self.input === "cli-box")
            if (err) { return callback(err); }
            self.pack = ul.merge(res, DEFAULT_PACK);
            callback(null, res);
        });
    } else {
        var repo = new gry(tmp.dirSync().name);
        repo.exec(oArgv({
            _: [self.input, "."]
          , depth: "1"
        }, "clone"), function (err) {
            if (err) { return callback(err); }
            rJson(repo.cwd + "/package.json", function (err, pack) {
                if (err) { return callback(err); }
                self.pack = ul.merge(pack, DEFAULT_PACK);
                callback(null, pack);
            });
        });
    }
};

/**
 * getGitUrl
 * Gets the git url of the package.
 *
 * @name getGitUrl
 * @function
 * @param {Function} callback The callback function.
 */
Gpm.prototype.getGitUrl = function (callback) {
    var self = this
      , err = null
      , url = null
      ;

    if (self.is_git) {
        return callback(null, self.input);
    }

    if (self.pack) {

        if (typeof self.pack.repository.url !== "string") {
            err = Error("The package does not contain any repository url.");
        }

        if (!err) {
            parsedUrl = GitUrlParse(self.pack.repository.url)
            url = parsedUrl.toString(self.url_type)
        }

        return callback(null, url);
    }

    self.getPack(function (err, pack) {
        if (err) {return callback(err); }
        self.getGitUrl(callback);
    });
};

/**
 * getPath
 * Gets the path to the repository.
 *
 * @name getPath
 * @function
 * @return {String} The path to the repository.
 */
Gpm.prototype.getPath = function () {
    return path.join(this.path, this.auto ? this.pack.name : "");
};

/**
 * runTask
 * Runs a script from `scripts` (`package.json`).
 *
 * @name runTask
 * @function
 * @param {String} task What npm task to run.
 * @param {Function} callback The callback function.
 */
Gpm.prototype.runTask = function (task, callback) {
    var self = this;
    if (typeof self.pack.scripts[task] !== "string") {
        return callback();
    }
    el.add(oArgv({ _: [task] }, "npm run"), { cwd: self.repoPath }, callback);
};

/**
 * exec
 * Executes a command in the repository.
 *
 * @name exec
 * @function
 * @param {String} command The command to execute.
 * @param {Function} callback The callback function.
 */
Gpm.prototype.exec = function (command, callback) {
    el.add(command, { cwd: this.repoPath }, callback);
};

/**
 * getDependencies
 * Returns the requested dependencies for installation
 *
 * @name getDependencies
 * @function
 * @return {Array} A list with the dependencies whose installation was required
 */
Gpm.prototype.getDependencies = function() {
  // A single dependency was requested
  if (typeof this.package === 'string') {
    return [this.package];
  }

  // A package.json was requested
  var dependencies = Object.keys(this.package.dependencies || {});
  if (this.is_dev) {
    dependencies = dependencies.concat(Object.keys(this.package.devDependencies || {}));
  }
  return dependencies;
};


/**
 * install
 * Installs the input package(s).
 *
 * @name install
 * @function
 * @param {Function} callback The callback function.
 * @param {Function} progress The progress function.
 */
Gpm.prototype.install = function(callback, progress) {
    var self = this;

    oneByOne(self.getDependencies().map(function(package) {
        return function(next) {
            self.name = package;
            self.installCurrent(next, progress);
        };
    }), callback);
};

/**
 * installCurrent
 * Installs the current package dependencies.
 *
 * @name installCurrent
 * @function
 * @param {Function} callback The callback function.
 * @param {Function} progress The progress function.
 */
Gpm.prototype.installCurrent = function (callback, progress) {
    var self = this;

    self.url_parsed = GitUrlParse(self.name);
    if (self.url_parsed.protocol !== "file") {
        self.input = self.url_parsed.toString(self.url_type);
        self.is_git = true;
    } else {
        self.input = self.name;
        self.is_git = false;
    }

    progress("Installing " + self.input);
    oneByOne([
        self.getPack.bind(self)
      , function (cb) {
            self.repoPath = self.getPath();
            cb(null, self.repoPath);
        }
      , function (cb, path) {
            mkdirp(path, cb);
        }
      , self.getGitUrl.bind(self)
      , function (cb, gitUrl) {
            progress("Clonning " + gitUrl);
            self.repo = new gry(self.repoPath);
            self.repo.exec(oArgv({
                _: [gitUrl, "."]
            }, "clone"), cb);
        }
      , self.runTask.bind(self, "preinstall")
      , function (cb) {
            // And here the recursive-magic is happening
            var dep = function (obj) {
                    return Object.keys(obj).map(function (name) {
                        return function (cb) {
                            if (self.depth === 1) {
                                return self.exec(oArgv({
                                    production: self.is_dev || undefined
                                  , _: "i"
                                }, "npm"), cb);
                            }
                            var cDep = new Gpm(name, {
                                dest: path.join(self.repoPath, "node_modules")
                              , url_type: self.url_type
                              , auto: self.auto
                              , is_dev: self.is_dev
                              , depth: self.depth - 1
                            });
                            cDep.install(cb, progress);
                        };
                    });
                }
              , deps = dep(self.pack.dependencies)
              ;

            if (self.dev_install) {
                deps = deps.concat(dep(self.pack.devDependencies));
            }

            if (!deps.length) {
                return cb();
            }

            sameTime(deps, cb);
        }
      , self.runTask.bind(self, "install")
      , self.runTask.bind(self, "postinstall")
    ], callback);
};

module.exports = Gpm;
