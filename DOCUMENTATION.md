## Documentation
You can see below the API reference of this module.

### `Gpm(package, options)`
Creates a new `Gpm` instance.

#### Params
- **String|Object** `package`: The git url, the npm package name or a package.json-like object.
- **Object** `options`: An object containing the following fields:

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

