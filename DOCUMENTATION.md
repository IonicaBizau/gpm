## Documentation

You can see below the API reference of this module.

### `Gpm(packageObj, options)`
Creates a new `Gpm` instance.

#### Params

- **String|Object** `packageObj`: The git url, the npm package name or a package.json-like object.
- **Object** `options`: An object containing the following fields:
 - `url_type` (String): A value interpreted by `git-url-parse` (default: `"ssh"`).
 - `dest` (String): The destination path (defaults to `process.cwd()`).
 - `nm_dest` (String): The node module folder name (defaults to 'node_modules').
 - `auto` (Boolean): If `true`, a new directory will be created in the destination directory (default: `true`).
 - `is_dev` (Boolean): If `true`, the dev dependencies will be installed as well (default: `false`).
 - `depth` (Number): The dependency tree depth (the other dependencies being installed via `npm`). Default is `Infinity`.
 - `version` (String): The dependency version.

#### Return
- **Gpm** The `Gpm` instance.

### `getPack(callback)`
Gets the module `package.json` object.

#### Params

- **Function** `callback`: The callback function.

### `getGitUrl(callback)`
Gets the git url of the package.

#### Params

- **Function** `callback`: The callback function.

### `getPath()`
Gets the path to the repository.

#### Return
- **String** The path to the repository.

### `runTask(task, callback)`
Runs a script from `scripts` (`package.json`).

#### Params

- **String** `task`: What npm task to run.
- **Function** `callback`: The callback function.

### `exec(command, callback)`
Executes a command in the repository.

#### Params

- **String** `command`: The command to execute.
- **Function** `callback`: The callback function.

### `getDependencies()`
Returns the requested dependencies for installation

#### Return
- **Array** A list with the dependencies whose installation was required

### `install(callback, progress)`
Installs the input package(s).

#### Params

- **Function** `callback`: The callback function.
- **Function** `progress`: The progress function.

### `installCurrent(callback, progress)`
Installs the current package dependencies.

#### Params

- **Function** `callback`: The callback function.
- **Function** `progress`: The progress function.

