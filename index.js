let { accessSync, constants: { F_OK } } = require("fs");

try {
  accessSync("./lib", F_OK);
  module.exports = require("./lib/discover");
} catch (_) {
  require('coffee-script/register');
  module.exports = require("./src/discover");
}
