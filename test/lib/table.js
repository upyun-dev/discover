var Table = require('../../lib/table');
var model = require('../../lib/model');
var database = require('../../lib/database');
var Field = require('../../lib/type');
var should = require('should');
var config = require('../conf/config');
var cache = require('../../lib/cache').init();

describe('lib/table.js', function() {
  var databaseCfg = config.database;

  var db = database.getPool(databaseCfg);

  before(function() {
    // create test table
    db.query('create table `test` (`id` int, `name` text)', [], function() {});
  });

  var table = new Table('test', [
    new Field.int({ name: 'id', pk: true }),
    new Field.int({ name: 'name' })
  ], db);

  var Model = model.init({ db: databaseCfg, cache: cache })({
    tableName: 'test',
    fields: [{
      unique: true,
      name: 'test'
    }, {
      unique: true,
      name: 'test_test'
    }, {
      unique: true,
      name: 'id'
    }, {
      name: 'name'
    }],
    indices: []
  });

  describe('findById', function() {

    context('when invoke findById with array ids', function() {
      it('should be successful when pks.length equals to array.length', function(done) {
        table.findById([1], function(err) {
          should.not.exist(err);
          done();
        });
      });

      it('should got an Error when pks.length not equals to array.length', function(done) {
        table.findById([1, 'non-exist'], function(err) {
          should.exist(err);
          done();
        });
      });
    });

    context('when invoke findById with an json object', function() {
      it('should be successful', function(done) {
        table.findById({ id: 1 }, function(err) {
          should.not.exist(err);
          done();
        });
      });
    });

    context('when invoke findById with one id', function() {
      it('should be successful when id in pks list', function(done) {
        table.findById(1, function(err) {
          should.not.exist(err);
          done();
        });
      });

      it('should not got an Error when id not in pks list', function(done) {
        table.findById('non-exist', function(err) {
          should.not.exist(err);
          done();
        });
      });
    });
  });

  describe('insert', function() {
    var model = new Model();

    it('should be successful', function(done) {
      table.insert(model, function(err, model) {
        should.exist(model);
        done();
      });
    });
  });

  describe('delete', function() {
    var model = new Model();

    it('should not be failure', function(done) {
      table.delete(model, function(err, ret) {
        ret.should.be.true();
        done();
      });
    });
  });

  describe('update', function() {
    var model = new Model();

    it('should not be failure if no attrs need to update', function(done) {
      table.update(model, function(err, ret) {
        ret.should.not.be.true();
        done();
      });
    });

    it('should eval the sql', function(done) {
      var model = new Model();
      model.test = 'a';
      model.test_test = 'b';
      model.id = '9';
      model.name = 'testname';
      table.update(model, function(err, ret) {
        should.not.exist(err);
        ret.should.be.ok();
        done();
      });
    });
  });
});
