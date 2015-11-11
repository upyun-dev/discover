var discover = require("../lib/discover");
var should = require("should");
var config = require('./conf/config');

describe("lib/discover.js", function () {
  var databaseCfg = config.database;

  var orm = discover(databaseCfg);

  it("should obtains 'Criteria' 'Model' and 'getPool' props", function () {
    orm.should.have.properties(['getPool', 'Model', 'Criteria']);
  });

  describe("getPool", function () {
    it("should return the db instance", function () {
      orm.getPool().should.have.properties(['query', 'next_sequence']);
    });
  });
});
