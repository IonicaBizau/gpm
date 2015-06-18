## Documentation
You can see below the API reference of this module.

### `Gpm(name, options)`
Creates a new `Gpm` instance.

#### Params
- **String** `name`: The git url or the npm package name.
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

### `install(callback, progress)`
Installs the current package dependencies.

#### Params
- **Function** `callback`: The callback function.
- **Function** `progress`: The progress function.

