var should = require('should');
var Model = require('../lib/model');

var databaseCfg = {
  poolSize: 5,
  host: '127.0.0.1',
  user: 'root',
  password: 'abbshr',
  database: 'robintest'
};

describe('Test lib/model.js', function () {
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

  describe('create a NewModel instance', function () {
    it('should be success', function () {
      var CustomModel = model;
      var newModel = new CustomModel;
      newModel.should.be.ok();
    });
  });
});
