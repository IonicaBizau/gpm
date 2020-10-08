"use strict";

// Dependencies
const gitSource = require("git-source")
    , packageJson = require("package-json")
    , ul = require("ul")
    , fs = require("fs")
    , Gry = require("gry")
    , tmp = require("tmp")
    , oArgv = require("oargv")
    , rJson = require("r-json")
    , mkdirp = require("mkdirp")
    , oneByOne = require("one-by-one")
    , sameTime = require("same-time")
    , ExecLimiter = require("exec-limiter")
    , deffy = require("deffy")
    , path = require("path")
    , isSemver = require("is-semver")
    , iterateObject = require("iterate-object")
    ;

// Constants
const DEFAULT_PACK = {
    repository: {}
  , scripts: {}
  , dependencies: {}
};

// Create the exec limiter
const el = new ExecLimiter(deffy(+process.env.GPM_PROCESS_COUT_LIMIT, 100));

class Gpm {
    /**
     * Gpm
     * Creates a new `Gpm` instance.
     *
     * @name Gpm
     * @function
     * @param {String|Object} packageObj The git url, the npm package name or a package.json-like object.
     * @param {Object} options An object containing the following fields:
     *
     *  - `url_type` (String): A value interpreted by `git-url-parse` (default: `"ssh"`).
     *  - `dest` (String): The destination path (defaults to `process.cwd()`).
     *  - `nm_dest` (String): The node module folder name (defaults to 'node_modules').
     *  - `auto` (Boolean): If `true`, a new directory will be created in the destination directory (default: `true`).
     *  - `is_dev` (Boolean): If `true`, the dev dependencies will be installed as well (default: `false`).
     *  - `depth` (Number): The dependency tree depth (the other dependencies being installed via `npm`). Default is `Infinity`.
     *  - `version` (String): The dependency version.
     *
     * @return {Gpm} The `Gpm` instance.
     */
    constructor (packageObj, options) {

        options = ul.merge(options, {
            url_type: "ssh"
          , dest: process.cwd()
          , nm_dest: 'node_modules'
          , auto: true
          , is_dev: process.env.NODE_ENV === 'production' ? false : true
          , depth: Infinity
        });

        this.package = packageObj;
        this.path = options.dest;
        this.nm_dest = options.nm_dest;
        this.auto = options.auto;
        this.url_type = options.url_type;
        this.is_dev = options.is_dev;
        this.depth = options.depth;
        this.version = options.version;
    }

    /**
     * getPack
     * Gets the module `package.json` object.
     *
     * @name getPack
     * @function
     * @param {Function} callback The callback function.
     */
    getPack (callback) {
        let parsed = this.url_parsed;

        if (!this.is_git) {
            packageJson(this.input, "latest").then(res => {
                this.pack = ul.merge(res, DEFAULT_PACK);
                callback(null, res);
            }).catch(callback);
        } else {
            let repo = new Gry(tmp.dirSync().name);
            repo.exec(oArgv({
                _: [this.input, "."]
              , depth: "1"
            }, "clone", true), (err) => {
                if (err) { return callback(err); }
                rJson(repo.cwd + "/package.json", (err, pack) => {
                    if (err) { return callback(err); }
                    this.pack = ul.merge(pack, DEFAULT_PACK);
                    callback(null, pack);
                });
            });
        }
    }

    /**
     * getGitUrl
     * Gets the git url of the package.
     *
     * @name getGitUrl
     * @function
     * @param {Function} callback The callback function.
     */
    getGitUrl (callback) {
        let err = null
          , url = null
          ;

        if (this.is_git) {
            return callback(null, this.input);
        }

        if (this.pack) {

            if (typeof this.pack.repository.url !== "string") {
                err = Error("The package does not contain any repository url.");
            }

            if (!err) {
                let parsedUrl = gitSource(this.pack.repository.url)
                url = parsedUrl.toString(this.url_type)
            }

            return callback(err, url);
        }

        this.getPack((err, pack) => {
            if (err) { return callback(err); }
            this.getGitUrl(callback);
        });
    }

    /**
     * getPath
     * Gets the path to the repository.
     *
     * @name getPath
     * @function
     * @return {String} The path to the repository.
     */
    getPath () {
        return path.join(this.path, this.auto ? this.pack.name : "");
    }

    /**
     * runTask
     * Runs a script from `scripts` (`package.json`).
     *
     * @name runTask
     * @function
     * @param {String} task What npm task to run.
     * @param {Function} callback The callback function.
     */
    runTask (task, callback) {
        if (typeof this.pack.scripts[task] !== "string") {
            return callback();
        }
        el.add(oArgv({ _: [task] }, "npm run", true), { cwd: this.repoPath }, callback);
    }

    /**
     * exec
     * Executes a command in the repository.
     *
     * @name exec
     * @function
     * @param {String} command The command to execute.
     * @param {Function} callback The callback function.
     */
    exec (command, callback) {
        el.add(command, { cwd: this.repoPath }, callback);
    }

    /**
     * getDependencies
     * Returns the requested dependencies for installation
     *
     * @name getDependencies
     * @function
     * @return {Array} A list with the dependencies whose installation was required
     */
    getDependencies() {
        let dependencies = [];

        // A single dependency was requested
        if (typeof this.package === 'string') {
            dependencies = [{ name: this.package, version: this.version }];
        } else {
            let _deps = this.package.dependencies = deffy(this.package.dependencies, {})
              , _devDeps = this.package.devDependencies = deffy(this.package.devDependencies, {})
              , collect = deps => {
                    iterateObject(_deps, (version, name) => dependencies.push({
                        name: name
                      , version: version
                    }));
                }
              ;

            collect(_deps);
            if (this.is_dev) {
                collect(_devDeps);
            }
        }

        dependencies.forEach(c => {
            if (!(c.is_semver = isSemver(c.version)) && c.version) {
                c.parsed = gitSource(c.version);
            }
        });

        return dependencies;
    }

    /**
     * install
     * Installs the input package(s).
     *
     * @name install
     * @function
     * @param {Function} callback The callback function.
     * @param {Function} progress The progress function.
     */
    install (callback, progress) {
        oneByOne(this.getDependencies().map(depObj => {
            return next => {
                this.dep_obj = depObj;
                this.installCurrent(next, progress);
            };
        }), callback);
    }

    /**
     * installCurrent
     * Installs the current package dependencies.
     *
     * @name installCurrent
     * @function
     * @param {Function} callback The callback function.
     * @param {Function} progress The progress function.
     */
    installCurrent (callback, progress) {

        this.url_parsed = this.dep_obj.parsed || gitSource(this.dep_obj.name);

        if (this.url_parsed.protocol !== "file") {
            this.input = this.url_parsed.toString(this.url_type);
            this.is_git = true;
        } else {
            this.input = this.dep_obj.name;
            this.is_git = false;
        }

        progress("Installing " + this.input);
        oneByOne([
            this.getPack.bind(this)
          , cb => {
                this.repoPath = this.getPath();
                cb(null, this.repoPath);
            }
          , (cb, path) => {
                mkdirp(path, cb);
            }
          , this.getGitUrl.bind(this)
          , (cb, gitUrl) => {
                fs.stat(`${this.repoPath}/.git`, (err, stat) => {
                    if (stat && stat.isDirectory()) {
                        progress(`Skipping already installed ${this.input}`)
                        cb()
                    } else {
                        progress("Cloning " + gitUrl);
                        this.repo = new Gry(this.repoPath);
                        this.repo.exec(oArgv({
                            _: [gitUrl, "."]
                        }, "clone", true), cb);
                    }
                })
            }
          , this.runTask.bind(this, "preinstall")
          , cb => {
                // And here the recursive-magic is happening
                var dep = obj => {
                        return Object.keys(obj).map(name => {
                            return cb => {
                                if (this.depth === 1) {
                                    return this.exec(oArgv({
                                        production: this.is_dev || undefined
                                      , _: "i"
                                    }, "npm", true), cb);
                                }

                                var cDep = new Gpm(name, {
                                    dest: path.resolve(this.repoPath, this.nm_dest)
                                  , nm_dest: this.nm_dest
                                  , url_type: this.url_type
                                  , auto: this.auto
                                  , is_dev: this.is_dev
                                  , depth: this.depth - 1
                                  , version: obj[name]
                                });

                                cDep.install(cb, progress);
                            };
                        });
                    }
                  , deps = dep(this.pack.dependencies)
                  ;
                if (this.dev_install) {
                   deps = deps.concat(dep(this.pack.devDependencies));
                }

                if (!deps.length) {
                    return cb();
                }

                sameTime(deps, cb);

            }
          , this.runTask.bind(this, "install")
          , this.runTask.bind(this, "postinstall")
        ], callback);
    }
}

module.exports = Gpm;
