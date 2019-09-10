













![gpm](http://i.imgur.com/lU98JRC.png)




# `$ gpm`

npm + git = gpm - Install NPM packages and dependencies from git repositories.




## Installation

```sh
$ npm i gpm
```



### CLI Usage
You can install the package globally and use it as command line tool:

```sh
$ npm i -g gpm
```

Then, run `gpm --help` and see what the CLI tool can do.








## Example


Here is an example how to use this package as library.





```js
// Dependencies
var Gpm = require("gpm");

// Install uls and its Node modules from git
var pack = new Gpm("git@github.com:IonicaBizau/node-ul.git", {

    // Use https
    url_type: "https"

    // Where to install this stuff?
  , dest: __dirname

    // Clone git repositories for the 3 level depth in dependency tree
  , depth: 2
    // ul <- typpy
    //    <- deffy <- *typpy
    //
    // *–this will not be a git repository
});

// Start the install
pack.install(function (err, data) {
    console.log(err || data);
}, function (m) {
    console.log(m);
});

```






## Documentation




For full API reference, see the [DOCUMENTATION.md][docs] file.





## How to contribute
Have an idea? Found a bug? See [how to contribute][contributing].



## License
See the [LICENSE][license] file.


[license]: /LICENSE
[contributing]: /CONTRIBUTING.md
[docs]: /DOCUMENTATION.md
