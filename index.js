const { accessSync, constants: { F_OK } } = require("fs");

try {
  accessSync(`${__dirname}/lib`, F_OK);
  module.exports = require("./lib/discover");
} catch (e) {
  require('coffeescript/register');
  module.exports = require("./src/discover");
}
