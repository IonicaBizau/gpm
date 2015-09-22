// Dependencies
var Gpm = require("../lib");

// Install git-stats and its Node modules from git
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
