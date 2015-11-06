var should = require("should");
var database = require("../lib/database");

var databaseCfg = {
  poolSize: 5,
  host: '127.0.0.1',
  user: 'root',
  password: 'abbshr',
  database: 'robintest'
};

describe("Test lib/database.js", function () {

  context("invoke getPool without an argument", function () {
    it("should throw an Error", function () {
      should.throws(database.getPool, Error);
    });
  });

  context("invoke getPool with an argument but without the spec-field", function () {
    it("should return the pool object include the field 'query' and 'next_sequence'", function () {
      var pool = database.getPool({});
      pool.should.have.properties(['query', 'next_sequence']);
    });
  });

  context("invoke getPool with the right-configured argument", function () {
    var pool = database.getPool(databaseCfg);
    var sql = "select * from users";
    var name = "sequence";
    var value = [];

    it("should return the pool object include the field 'query' and 'next_sequence'", function () {
      pool.should.have.properties(['query', 'next_sequence']);
    });

    context("when query without argument 'value'", function () {
      it("query method should be evaluate successfully", function (done) {
        pool.query(sql, function (err, rows, fields) {
          should.not.exist(err);
          done();
        });
      });
    });

    context("when query with argument 'value'", function () {
      it("query method should be evaluate successfully", function (done) {
        pool.query(sql, value, function (err, rows, fields) {
          should.not.exist(err);
          arguments.length.should.be.above(1);
          done();
        });
      });
    });

    context("when execute an empty query", function () {
      it("callback should be invoked with the err", function (done) {
        pool.query("", value, function (err) {
          should.exist(err);
          done();
        });
      });
    });

    context("when Table 'sequence' exist", function () {
      it("next_sequence should generate inc-id", function (done) {
        pool.next_sequence(name, function (err, id) {
          should.exist(id);
          pool.next_sequence(name, function (err, newId) {
            newId.should.be.equal(id + 1);
            done();
          });
        });
      });
    });
  });
});
