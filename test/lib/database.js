var should = require("should");
var database = require("../../lib/database");
var config = require('../conf/config');

var databaseCfg = config.database;
var dup_databaseCfg = config.dup_database;

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

    context("when eval a query on a pool which size is not enough", function () {
      it('should got an error on callback', function (done) {
        var pool = database.getPool(dup_databaseCfg);
        pool.query('select', function (err) {
          should.exist(err);
          done();
        });
      });
    });

    context("when eval next_sequence with a db that doesn't has a sequence Table", function () {
      var pool = database.getPool(dup_databaseCfg);
      it('should got an error on callback', function (done) {
        pool.next_sequence(name, function (err) {
          should.exist(err);
          done();
        });
      });
    })
  });
});
