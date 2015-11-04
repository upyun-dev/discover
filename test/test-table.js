var Table = require("../lib/table");
var model = require('../lib/model');
var database = require("../lib/database");
var Field = require('../lib/type');
var should = require("should");

var databaseCfg = {
  poolSize: 5,
  host: '127.0.0.1',
  user: 'root',
  password: 'abbshr',
  database: 'robintest'
};

describe("Test lib/table.js", function () {
  var db = database.getPool(databaseCfg);
  var table = new Table("test", [
    new Field.int({ name: "id", pk: true }),
    new Field.int({ name: "name" })
  ], db);

  var Model = model.init({ db: databaseCfg })({
    tableName: 'test'
  });

  describe('test public method - findById', function () {

    describe("invoke findById with array ids", function () {
      context("when pks.length equals to array.length", function () {
        it('should be successful', function (done) {
          table.findById([1], function (err) {
            should.not.exist(err);
            done();
          });
        });
      });

      context("when pks.length not equals to array.length", function () {
        it("should got an Error", function (done) {
          table.findById([1, 'non-exist'], function (err) {
            should.exist(err);
            done();
          });
        });
      });
    });

    describe("invoke findById with an json object", function () {
      it("should be successful", function (done) {
        table.findById({ id: 1 }, function (err) {
          should.not.exist(err);
          done();
        });
      });
    });

    describe("invoke findById with one id", function () {
      context('when id in pks list', function () {
        it('should be successful', function (done) {
          table.findById(1, function (err) {
            should.not.exist(err);
            done();
          });
        });
      });

      context("when id not in pks list", function () {
        it('should not got an Error', function (done) {
          table.findById('non-exist', function (err) {
            should.not.exist(err);
            done();
          });
        });
      });
    });
  });

  describe('test public method - insert', function () {
    var model = new Model();

    it('should be successful', function (done) {
      table.insert(model, function (err, model) {
        // table.findById();
        // console.log(model);
        should.exist(model);
        done();
      });
    });
  });

  describe('test public method - delete', function () {
    var model = new Model();

    it('should not be failure', function (done) {
      table.delete(model, function (err, ret) {
        ret.should.be.true();
        done();
      });
    });
  });

  describe('test public method - update', function () {
    var model = new Model();

    it('should not be failure', function (done) {
      table.update(model, function (err, ret) {
        ret.should.not.be.true();
        done();
      });
    });
  });
});
