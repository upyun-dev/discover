var discover = require("../lib/discover");
var should = require("should");

var databaseCfg = {
  poolSize: 5,
  host: '127.0.0.1',
  user: 'root',
  password: 'abbshr',
  database: 'robintest'
};

describe("Test lib/discover.js", function () {
  var orm = discover(databaseCfg);

  it("should obtains 'Criteria' 'Model' and 'getPool' props", function () {
    orm.should.have.properties(['getPool', 'Model', 'Criteria']);
  });

  describe("test method getPool", function () {
    it("should return the db instance", function () {
      orm.getPool().should.have.properties(['query', 'next_sequence']);
    });
  });
});
