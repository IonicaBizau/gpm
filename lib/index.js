// Dependencies
var GitUrlParse = require("git-url-parse")
  , PackageJson = require("package-json")
  , Ul = require("ul")
  , Gry = require("gry")
  , Tmp = require("tmp")
  , OArgv = require("oargv")
  , RJson = require("r-json")
  , Mkdirp = require("mkdirp")
  , OneByOne = require("one-by-one")
  , SameTime = require("same-time")
  , ExecLimiter = require("exec-limiter")
  , Deffy = require("deffy")
  , Path = require("path")
  ;

// Constants
const DEFAULT_PACK = {
    repository: {}
  , scripts: {}
  , dependencies: {}
};

// Create the exec limiter
var el = new ExecLimiter(Deffy(parseInt(process.env.GPM_PROCESS_COUT_LIMIT) || 100));

/**
 * Gpm
 * Creates a new `Gpm` instance.
 *
 * @name Gpm
 * @function
 * @param name {String} The git url or the npm package name.
 * @param options {Object} An object containing the following fields:
 * @return {Gpm} The `Gpm` instance.
 */
function Gpm(name, options) {

    options = Ul.merge(options, {
        url_type: "ssh"
      , dest: process.cwd()
      , auto: true
      , is_dev: false
    });

    this.path = options.dest;
    this.auto = options.auto;
    this.url_type = options.url_type;
    this.url_parsed = GitUrlParse(name);
    this.is_dev = options.is_dev;

    if (this.url_parsed.protocol !== "file") {
        this.input = this.url_parsed.toString(options.url_type);
        this.is_git = true;
    } else {
        this.input = name;
        this.is_git = false;
    }
}

Gpm.prototype.getPack = function (callback) {
    var self = this
      , parsed = self.url_parsed
      ;

    if (!self.is_git) {
        PackageJson(self.input, "latest", function (err, res) {
            if (self.input === "cli-box")
            if (err) { return callback(err); }
            self.pack = Ul.merge(res, DEFAULT_PACK);
            callback(null, res);
        });
    } else {
        var repo = new Gry(Tmp.dirSync().name);
        repo.exec(OArgv({
            _: [self.input, "."]
          , depth: "1"
        }, "clone"), function (err) {
            if (err) { return callback(err); }
            RJson(repo.cwd + "/package.json", function (err, pack) {
                if (err) { return callback(err); }
                self.pack = Ul.merge(pack, DEFAULT_PACK);
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
 * @param callback {Function} The callback function.
 */
Gpm.prototype.getGitUrl = function (callback) {
    var self = this;
    if (self.is_git) {
        return callback(null, self.input);
    }
    if (self.pack) {

        var url = self.pack.repository.url
          , err = null
          ;

        if (!url) {
            err = new Error("Cannot find the git url.");
        }

        return callback(err, url);
    }

    self.getPack(function (err, pack) {
        if (err) { return callback(err); }
        self.getGitUrl(callback);
    });
};

Gpm.prototype.getPath = function () {
    return Path.join(this.path, this.auto ? this.pack.name : "");
};

Gpm.prototype.runTask = function (task, callback) {
    var self = this;
    if (typeof self.pack.scripts[task] !== "string") {
        return callback();
    }
    el.exec(OArgv({ _: [task] }, "npm run"), { cwd: self.repoPath }, callback);
};

Gpm.prototype.exec = function (command, callback) {
    el.add(command, { cwd: this.repoPath }, callback);
};

/**
 * install
 * Installs the current package dependencies.
 *
 * @name install
 * @function
 * @param callback {Function} The callback function.
 * @param progress {Function} The progress function.
 */
Gpm.prototype.install = function (callback, progress) {
    var self = this;
    progress("Installing " + self.input);
    OneByOne([
        self.getPack.bind(self)
      , function (cb) {
            self.repoPath = self.getPath();
            cb(null, self.repoPath);
        }
      , function (cb, path) {
            Mkdirp(path, cb);
        }
      , self.getGitUrl.bind(self)
      , function (cb, gitUrl) {
            progress("Clonning " + gitUrl);
            self.repo = new Gry(self.repoPath);
            self.repo.exec(OArgv({
                _: [gitUrl, "."]
            }, "clone"), cb);
        }
      , self.runTask.bind(self, "preinstall")
      , function (cb) {
            // And here the recursive-magic is happening
            var dep = function (obj) {
                    return Object.keys(obj).map(function (name) {
                        return function (cb) {
                            var cDep = new Gpm(name, {
                                dest: Path.join(self.repoPath, "node_modules")
                              , url_type: self.url_type
                            });
                            cDep.install(cb, progress);
                        }
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

            SameTime(deps, cb);
        }
      , self.runTask.bind(self, "install")
      , self.runTask.bind(self, "postinstall")
    ], callback);
};

module.exports = Gpm;
