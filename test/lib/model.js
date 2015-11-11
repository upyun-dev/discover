var should = require('should');
var Model = require('../../lib/model');

var databaseCfg = require('../conf/config').database;

describe('lib/model.js', function () {
  Model = Model.init({ db: databaseCfg });
  var model = Model({
    tableName: 'test',
    fields: [{
      type: 'int',
      unique: true,
      name: 'test'
    }],
    indices: []
  });

  context('when not defined the type in fields', function () {
    var model = Model({
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
    it('should be success', function () {
      model.should.be.ok();
    });

    context('when invoke a funcName on the NewModel', function () {
      it('method should exists and throw an error', function () {
        should.throws(model.findByTest, Error);
      });
    });

    context('when invoke setter / getter', function () {
      it('should assign the value to field', function () {
        var newModel = new model;
        newModel.id = 'id';
        newModel.id.should.be.equal('id');
      });
    });
  });

  context('when unique or index not in fields', function () {
    it('newModel.findByCustomKey should not exist', function () {
      var model = Model({
        tableName: 'test',
        fields: [{
          name: 'test'
        }],
        indices: []
      })
      should.not.exist(model.findByTest);
    });
  });

  context('when invoke Model with new or as a normal function', function () {
    it('should return a newModel Class', function () {
      var model = Model({
        tableName: 'test',
        fields: [{
          type: 'int',
          unique: true,
          name: 'test'
        }],
        indices: []
      });
      var modelWithNew = new Model({
        tableName: 'test'
      });
      model.$constructor.should.be.equal(modelWithNew.$constructor);
    });
  });

  describe('instance', function () {
    it('should be success', function () {
      var CustomModel = model;
      var newModel = new CustomModel;
      newModel.should.be.ok();
    });
  });
});
