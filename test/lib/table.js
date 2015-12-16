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
    db.query('create table `test` (`id` int, `name` text, `col` int)', [], function(e) {});
  });

  var table = new Table('test', [
    new Field.int({ name: 'id', pk: true }),
    new Field.int({ name: 'name' }),
    new Field.int({ column: 'col', auto: true })
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
    it('should got an error when add an non-exist pks', function(done) {
      table.pks[0].type = 'hash';
      table.findById(1, function(err) {
        should.not.exist(err);
        delete table.pks[0].type;
        done();
      });
    });
    it('should got an error when id is invalid', function(done) {
      var tmp = table.pks[0];
      table.pks.pop();
      table.findById(undefined, function(err) {
        should.exist(err);
        table.pks.push(tmp);
        done();
      });
    });
    it('should got err and null when db.query get an error', function(done) {
      var tmp = table.db.query;
      table.db.query = function(sql, args, callback) {
        callback(new Error());
      };
      table.findById([1], function(err) {
        should.exist(err);
        table.findById([1]);
        table.db.query = tmp;
        done();
      });
    });
    it('should get rows[0] when rows.length > 0', function() {
      var tmp = table.db.query;
      table.db.query = function(sql, args, callback) {
        callback(null, [1, 2]);
      };
      table.findById([1]);
      table.db.query = tmp;
    });

    context('when invoke findById with array ids', function() {
      it('should be successful when pks.length equals to array.length', function(done) {
        table.findById([1], function(err) {
          should.not.exist(err);
          table.findById([1]);
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
          table.findById({ id: 1 });
          done();
        });
      });
    });

    context('when invoke findById with one id', function() {
      it('should be successful when id in pks list', function(done) {
        table.findById(1, function(err) {
          should.not.exist(err);
          table.findById(1);
          done();
        });
      });
      it('should not got an Error when id not in pks list', function(done) {
        table.findById('non-exist', function(err) {
          should.not.exist(err);
          table.findById('non-exist');
          done();
        });
      });
    });
  });

  describe('insert', function() {
    var model = new Model();
    it('should be successful', function(done) {
      table.insert(model, function(err, model) {
        should.not.exist(err);
        should.exist(model);
        table.insert(model);
        done();
      });
    });
    it('should got an error when db.query failed', function(done) {
      var tmp = table.db.query;
      table.db.query = function(sql, args, callback) {
        callback(new Error());
      };
      table.insert(model, function(err) {
        should.exist(err);
        table.insert(model);
        table.db.query = tmp;
        done();
      });
    });
  });

  describe('delete', function() {
    var model = new Model();

    it('should not be failure', function(done) {
      table.delete(model, function(err, ret) {
        ret.should.be.true();
        table.delete(model);
        done();
      });
    });

    it('should got an error when db.query failed', function(done) {
      var tmp = table.db.query;
      table.db.query = function(sql, args, callback) {
        callback(new Error());
      };
      table.delete(model, function(err) {
        should.exist(err);
        table.delete(model);
        table.db.query = tmp;
        done();
      });
    });
  });

  describe('update', function() {
    var model = new Model();

    it('should not be failure if no attrs need to update', function(done) {
      table.update(model, function(err, ret) {
        ret.should.not.be.true();
        table.update(model);
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
        table.update(model);
        done();
      });
    });

    it('should be ok', function(done) {
      var model = new Model();
      model.test = 'm';
      model.test_test = 'n';
      model.id = '10';
      model.name = 'sss';
      var tmp = table.nonPKFields;
      table.nonPKFields = [];
      table.update(model, function(err, ret) {
        should.not.exist(err);
        ret.should.false();
        table.nonPKFields = tmp;
        table.update(model);
        done();
      });
    });

    it('should got an error when db.query failed', function(done) {
      var tmp = table.db.query;
      table.db.query = function(sql, args, callback) {
        callback(new Error());
      };
      model.test = 'fff';
      model.name = 'qqq';
      table.update(model, function(err) {
        should.exist(err);
        table.update(model);
        table.db.query = tmp;
        done();
      });
    });
    
    it('should be ok when callback is not provide', function() {
      var tmp = table.nonPKFields;
      table.nonPKFields = [];
      model.test = 'p';
      model.test_test = 't';
      model.id = '14';
      model.name = 'dk';
      table.update(model).should.be.ok();
    });
  });
});
