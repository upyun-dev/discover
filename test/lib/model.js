var should = require('should');
var model = require('../../lib/model');
var config = require('../conf/config');

describe('lib/model.js', function() {
  var databaseCfg = config.database;

  model = model.init({ db: databaseCfg });
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
      }, {
        unique: true,
        name: 'test_test'
      }, {
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

  describe('instance', function() {
    it('should be success', function() {
      var CustomModel = Model;
      var newModel = new CustomModel();
      newModel.should.be.ok();
    });
  });
});
