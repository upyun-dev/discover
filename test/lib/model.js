var should = require('should');
var config = require('../conf/config');
var database = require('../../lib/database');
var db = database.getPool(config.database);
var cache = require('../../lib/cache').init();
var model = require('../../lib/model').init({
  db: db,
  cache: cache
});

describe('lib/model.js', function() {
  var Model = model({
    tableName: 'test',
    fields: [{
      type: 'int',
      unique: true,
      name: 'test'
    }],
    indices: []
  });

  context('when not defined the type in fields', function() {
    var Model = model({
      tableName: 'test',
      fields: [{
        unique: true,
        name: 'test'
      },
      {
        unique: true,
        name: 'test_test'
      },
      {
        unique: true,
        name: 'id'
      }],
      indices: []
    });
    it('should be success', function() {
      Model.should.be.ok();
    });

    context('when invoke a funcName on the NewModel', function() {
      it('method should exists and throw an error', function() {
        should.exists(Model.findByTest);
        should.throws(Model.findByTest, Error);
      });
    });

    context('when invoke setter / getter', function() {
      it('should assign the value to field', function() {
        var newModel = new Model();
        newModel.id = 'id';
        newModel.id.should.be.equal('id');
      });
    });
  });

  context('when unique or index not in fields', function() {
    it('newModel.findByCustomKey should not exist', function() {
      var Model = model({
        tableName: 'test',
        fields: [{
          name: 'test'
        }],
        indices: []
      });
      should.not.exist(Model.findByTest);
    });
  });

  context('when invoke Model with new or as a normal function', function() {
    it('should return a newModel Class', function() {
      var ModelAsContructor = model;
      var Model = ModelAsContructor({
        tableName: 'test',
        fields: [{
          type: 'int',
          unique: true,
          name: 'test'
        }],
        indices: []
      });
      var modelWithNew = new ModelAsContructor({
        tableName: 'test'
      });
      Model.$constructor.should.be.equal(modelWithNew.$constructor);
    });
  });

  context('when model field name is "domain"', function() {
    var DomainModel = model({
      tableName: 'test_domain',
      fields: [{
        unique: true,
        name: 'domain'
      }],
      indices: []
    });
    var domainModel = new DomainModel({
      domain: 'domainValue'
    });

    it('should be success', function() {
      domainModel.domain.should.be.equal('domainValue');
    });
  });

  context('when defined `secure` in fields', function() {
    var Model = model({
      tableName: 'test-a',
      fields: [{
        unique: true,
        name: 'test'
      },
      {
        unique: true,
        name: 'test_test'
      },
      {
        unique: true,
        name: 'id'
      },
      {
        name: 'need_4_secure',
        secure: true
      }],
      indices: []
    });

    it('the return of the `toJSON` method on the model should not contains the `"secure"`d field', function() {
      var newModel = new Model();
      should.not.exist(newModel.toJSON()['need_4_secure']);
    });
  });

  describe('instance', function() {
    it('should be success', function() {
      var CustomModel = Model;
      var newModel = new CustomModel();
      newModel.should.be.ok();
    });
  });

  describe('initialize', function() {
    it('should be ok when this.initialize is a function', function(done) {
      var Model = model({
        tableName: 'test',
        fields: [{
          unique: true,
          name: 'test'
        },
        {
          index: true,
          name: 'test_test'
        },
        {
          unique: true,
          name: 'id'
        }],
        indices: []
      });
      Model.prototype._initialize = Model.prototype.initialize;
      Model.prototype.initialize = function() {};
      Model.findByTestTest('', function() {
        var m = new Model();
        m.should.be.ok();
        Model.prototype.initialize = Model.prototype._initialize;
        done();
      });
    });
  });
});
