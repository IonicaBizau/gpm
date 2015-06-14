// Dependencies
var Gpm = require("../lib");

// Install git-stats and its Node modules from git
var pack = new Gpm("git@github.com:IonicaBizau/git-stats.git", {
    url: "http"
  , dest: __dirname
  , auto: true
});

// Start the install
pack.install(function (err, data) {
    console.log(err || data);
}, function (m) {
    console.log(m);
});
