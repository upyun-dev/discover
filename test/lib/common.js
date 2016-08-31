// Generated by CoffeeScript 1.10.0
(function() {
  var Model, ModelFactory, cache, config, database, db, model, should;

  should = require('should');

  config = require('../conf/config');

  database = require('../../lib/database');

  cache = require('../../lib/cache').init();

  db = database.getPool(config.database);

  ModelFactory = require('../../lib/model').init({
    db: db,
    cache: cache
  });

  // require('../../lib/criteria').init({
  //   db: db,
  //   cache: cache
  // });

  Model = ModelFactory({
    tableName: 'common_test',
    fields: [
      {
        name: 'non_uniq'
      },
      {
        unique: true,
        name: 'uniq'
      },
      {
        pk: true,
        name: 'id'
      }
    ],
    indices: []
  });

  model = new Model({
    'non_uniq': 1,
    'uniq': 2,
    'id': 3
  });

  describe('lib/common', function() {
    before(function() {
      db.query('create table `common_test` (`id` int NOT NULL, `uniq` int, `non_uniq` int, PRIMARY KEY (`id`))', [], (function() {}));
      return db.query('create table `no_id_common_test` (`uniq` int, `non_uniq` int)', [], (function() {}));
    });
    describe('classMethods', function() {
      describe('._walk', function() {
        it('should return an array contains the method with specified prefix when there are not any validate methods', function(done) {
          Model._walk(model, 'validate', function(ret) {
            ret.length.should.equal(0);
            done();
          });
        });

        it('should return an array contains the method with specified prefix', function(done) {
          Model.prototype.validateFoo = function(callback) {
            return callback(null);
          };
          Model.prototype.validateBar = function(callback) {
            return callback(null);
          };
          Model._walk(model, 'validate', function(ret) {
            ret.length.should.equal(2);
            done();
          });
        });

        context('when validate methods update', function() {
          it('should return an array contains the method with specified prefix  if it still be a function', function(done) {
            Model.prototype.validateFoo = function(callback) {
              if (callback)
                callback(null);
            };
            Model._walk(model, 'validate', function(ret) {
              ret.length.should.equal(2);
              done();
            });
          });

          it('should return an array contains the method with specified prefix  if it is no longer a function', function(done) {
            Model.prototype.validateFoo = null;
            Model._walk(model, 'validate', function(ret) {
              ret.length.should.equal(1);
              done();
            });
          });
        });
      });
      describe('.insert', function() {
        it('should got an error when invoking with a non-model object', function(done) {
          Model.insert({});
          return Model.insert({}, function(err) {
            should.exists(err);
            return done();
          });
        });
        it('should got an error when $table.insert failed', function(done) {
          var tmp = Model.$table.insert;
          Model.$table.insert = function(model, cb) {
            cb(new Error());
          };
          Model.insert(model, function(err) {
            should.exist(err);
            Model.$table.insert = tmp;
            done();
          });
        });
        context('when invoking with a model', function() {
          it('should be succeed', function(done) {
            return Model.insert(model, function(err, result) {
              should.exists(result);
              Model.insert(model);
              return done();
            });
          });
          it('should be fault when a validator test failed', function(done) {
            Model.prototype.validateErr = function(callback) {
              return callback(new Error());
            };
            return Model.insert(model, function(err) {
              should.exists(err);
              return done();
            });
          });
          return after(function() {
            return delete Model.prototype.validateErr;
          });
        });
      });
      describe('.all', function() {
        return it('should return the matched items', function(done) {
          return Model.all(function(err, ret) {
            should.not.exists(err);
            ret[0].attributes.non_uniq.should.equal(1);
            return done();
          },
          {
            non_uniq: 1
          });
        });
      });
      describe('.count', function() {
        it('should return the count of the matched items', function(done) {
          return Model.count({
            nonUniq: {
              op: 'gt',
              value: 0
            }
          }, function(err, count) {
            should.not.exists(err);
            count.should.equal(1);
            return done();
          });
        });
        it('should return the count of all item when pass a null opts', function(done) {
          return Model.count(null, function(err, count) {
            should.not.exists(err);
            count.should.equal(1);
            return done();
          });
        });
        return it('should return the count of the matched items when opts contains an query object', function(done) {
          return Model.count({
            nonUniq: 1
          }, function(err, count) {
            should.not.exists(err);
            count.should.equal(1);
            return done();
          });
        });
      });
      describe('.find', function() {
        context('execute multi-conditions on one field', function() {
          it('should be ok and return the matched result', function(done) {
            Model.find({
              uniq: 2,
              nonUniq: [
                { op: 'gt', value: 3 },
                { op: 'lt', value: 6 }
              ]
            }, function(err, result) {
              should.not.exists(err);
              result.length.should.equal(0);
              return done();
            });
          });          
        });

        it('should be ok and return the matched result', function(done) {
          return Model.find({
            uniq: 2,
            nonUniq: {
              op: 'lt',
              value: 3
            }
          }, function(err, result) {
            should.not.exists(err);
            result[0].attributes.uniq.should.equal(2);
            return done();
          });
        });
        it('should get an error when id not exists', function(done) {
          var NoIdModel;
          NoIdModel = ModelFactory({
            tableName: 'no_id_common_test',
            fields: [
              {
                name: 'non_uniq'
              },
              {
                unique: true,
                name: 'uniq'
              }
            ],
            indices: []
          });
          return NoIdModel.find({
            uniq: 2
          }, function(err) {
            should.exist(err);
            return done();
          });
        });
        return it('should be ok when pass an null opts', function(done) {
          return Model.find(null, function(err) {
            should.not.exist(err);
            return done();
          });
        });
      });
      describe('.findOne', function() {
        it('should be ok and return the certain one item that matches the conditions', function(done) {
          return Model.findOne({
            uniq: 2,
            non_uniq: 1
          }, function(err, result) {
            should.not.exists(err);
            result.attributes.uniq.should.equal(2);
            result.attributes.non_uniq.should.equal(1);
            return done();
          });
        });
        it('should be ok when pass an null opts', function(done) {
          return Model.findOne(null, function(err) {
            should.not.exist(err);
            return done();
          });
        });
        it('should got an error when this.find got an error', function(done) {
          var NoIdModel;
          NoIdModel = ModelFactory({
            tableName: 'no_id_common_test',
            fields: [
              {
                name: 'non_uniq'
              },
              {
                unique: true,
                name: 'uniq'
              }
            ],
            indices: []
          });
          return NoIdModel.findOne({
            uniq: 2
          }, function(err) {
            should.exist(err);
            return done();
          });
        });
        return it('should return nothing when this.find got nothing', function(done) {
          return Model.findOne({
            uniq: 5
          }, function(err, ret) {
            should.not.exist(err);
            should.not.exist(ret);
            return done();
          });
        });
      });
      describe('.findWithCount', function() {
        return it('should return the matched results with its count', function(done) {
          return Model.findWithCount({
            uniq: 2
          }, function(err, ret) {
            should.not.exists(err);
            ret.should.have.properties(['rows', 'total']);
            return done();
          });
        });
      });
      describe('.findByIndex', function() {
        return it('should be ok and return the item with the given index', function(done) {
          return Model.findByIndex('id', 3, function(err, ret) {
            should.not.exists(err);
            ret[0].attributes.non_uniq.should.equal(1);
            return done();
          });
        });
      });
      describe('.findByUniqueKey', function() {
        it('should be ok and return the item with the given unique key', function(done) {
          return Model.findByUniqueKey('uniq', 2, function(err, result) {
            should.not.exists(err);
            result.attributes.uniq.should.equal(2);
            return done();
          });
        });
        it('should got an error when this.findByIndex got an error', function(done) {
          return Model.findByUniqueKey('uniq', 5, function(err, ret) {
            should.not.exist(ret);
            return done();
          });
        });
        it('should got an error when findByIndex failed', function(done) {
          var tmp = Model.findByIndex;
          Model.findByIndex = function(k, v, cb) {
            cb(new Error());
          };
          Model.findByUniqueKey('uniq', 5, function(err, ret) {
            should.exist(err);
            Model.findByIndex = tmp;
            done();
          });
        });
      });
      describe('.findById', function() {
        it('should be ok and return the item with the given id', function(done) {
          return Model.findById(3, function(err, ret) {
            should.not.exists(err);
            ret.attributes.uniq.should.equal(2);
            return done();
          });
        });
        it('should return nothing when given a non-exist id', function(done) {
          return Model.findById(5, function(err, ret) {
            should.not.exist(err);
            should.not.exist(ret);
            return done();
          });
        });
        it('should got an error when findByIds failed', function(done) {
          var tmp = Model.findByIds;
          Model.findByIds = function(ids, cb) {
            cb(new Error());
          };
          Model.findById(5, function(err, ret) {
            should.exist(err);
            should.not.exist(ret);
            Model.findByIds = tmp;
            done();
          });
        });
        it('should got null when objs.length is 0', function(done) {
          var tmp = Model.findByIds;
          Model.findByIds = function(ids, cb) {
            cb(null, []);
          };
          Model.findById(5, function(err, ret) {
            should.not.exist(err);
            should.not.exist(ret);
            Model.findByIds = tmp;
            done();
          });
        });
        return it('should got an error when this.findByIds got an error', function(done) {
          return done();
        });
      });
      describe('.findByIds', function() {
        it('should be ok and return a group of items with the given ids', function(done) {
          return Model.findByIds([1, 2, 3, 4], function(err, ret) {
            var i;
            should.not.exists(err);
            ((function() {
              var j, len, results;
              results = [];
              for (j = 0, len = ret.length; j < len; j++) {
                i = ret[j];
                if (i !== null) {
                  results.push(i);
                }
              }
              return results;
            })()).length.should.equal(1);
            return done();
          });
        });
        it('should throw an error when ids isnt an Array', function() {
          return Model.findByIds.bind(Model, 3).should['throw']();
        });
        it('should be ok when cache.get failed and _loadFromDB failed', function(done) {
          var tmp = Model.cache.get;
          Model.cache.get = function(key, callback) {
            callback(new Error('ggg'), []);
          };
          var tmpLoadFromDB = Model._loadFromDB;
          Model._loadFromDB = function(kid, callback) {
            callback(new Error());
          };
          Model.findByIds([1, 2, 3, 4], function(err) {
            should.exist(err);
            Model.cache.get = tmp;
            Model._loadFromDB = tmpLoadFromDB;
            done();
          });
        });
        it('should be ok when rows[keys[i]] exists', function(done) {
          var tmp = Model.cache.get;
          var rows = {};
          [1, 2, 3, 4].forEach(function(id) {
            rows[Model._cacheKey(id)] = {
              uniq: 2,
              non: 1
            };
          });
          Model.cache.get = function(key, callback) {
            callback(new Error('ggg'), rows);
          };
          Model.findByIds([1, 2, 3, 4], function(err) {
            should.not. exist(err);
            Model.cache.get = tmp;
            done();
          },
          {
            json: true,
            secure: {}
          });
        });
        return it('should return empty result when ids.length is zero', function(done) {
          return Model.findByIds([], function(err, ret) {
            should.not.exist(err);
            ret.should.be.empty();
            return done();
          });
        });
      });
      describe('._loadFromDB', function() {
        it('should got an error when findById failed', function(done) {
          var tmp = Model.$table.findById;
          Model.$table.findById = function(id, cb) {
            cb(new Error());
          };
          Model._loadFromDB(1, function(err) {
            should.exist(err);
            Model.$table.findById = tmp;
            done();
          });
        });
      });
      describe('.before', function() {
        it('should do nothing when add hooks on a non-supprot method', function() {
          Model.before('find', (function() {}));
          return Model._beforeHooks.find.length.should.equal(0);
        });
        return it('should be succeed when add a valid hook', function() {
          Model.before('insert', function(done) {
            return done(null);
          });
          return should.exists(Model._beforeHooks.insert);
        });
      });
      describe('.after', function() {
        it('should do nothing when add hooks on a non-supprot method', function() {
          Model.after('find', (function() {}));
          return Model._afterHooks.find.length.should.equal(0);
        });
        return it('should be succeed when add a valid hook', function() {
          Model.after('insert', function(done) {
            return done(null);
          });
          return should.exists(Model._afterHooks.insert);
        });
      });
      describe('._isValidMethod', function() {
        return it('should only success when method name matchs insert or update or delete', function() {
          should.ok(Model._isValidMethod('insert'));
          should.ok(Model._isValidMethod('update'));
          should.ok(Model._isValidMethod('delete'));
          return Model._isValidMethod('find').should.be['false']();
        });
      });
      describe('._newInstance', function() {
        return it('should be ok when data is invalid', function() {
          var DefaultModel;
          DefaultModel = ModelFactory({
            tableName: 'default_common_test',
            fields: [
              {
                name: 'non_uniq'
              },
              {
                unique: true,
                name: 'uniq'
              },
              {
                name: 'default',
                'default': 9
              }
            ],
            indices: []
          });
          return should.ok(DefaultModel._newInstance({
            uniq: 2,
            non: 1
          },
          {}));
        });
      });
      describe('.update', function() {
        it('should got an error when invoking with a non-model object', function() {
          Model.update({});
          return Model.update({}, function(err) {
            return should.exists(err);
          });
        });
        it('should got an error when $table.update failed', function(done) {
          var tmp = Model.$table.update;
          Model.$table.update = function(model, cb) {
            cb(new Error());
          };
          Model.update(model, function(err) {
            should.exist(err);
            Model.$table.update = tmp;
            done();
          });
        });
        return context('when invoking with a model', function() {
          it('should be succeed', function(done) {
            return Model.update(model, function(err, result) {
              should.exists(result);
              model.uniq = 5;
              return Model.update(model, function(err, result) {
                should.exist(result);
                Model.update(model);
                return done();
              });
            });
          });
          it('should be fault when a validator test failed', function(done) {
            Model.prototype.validateErr = function(callback) {
              return callback(new Error());
            };
            return Model.update(model, function(err) {
              should.exists(err);
              return done();
            });
          });
          return after(function() {
            return delete Model.prototype.validateErr;
          });
        });
      });
      describe('.delete', function() {
        it('should got an error when invoking with a non-model object', function() {
          Model.delete({});
          return Model['delete']({}, function(err) {
            return should.exists(err);
          });
        });
        it('should got an error when $table.delete failed', function(done) {
          var tmp = Model.$table.delete;
          Model.$table.delete = function(model, cb) {
            cb(new Error());
          };
          Model.delete(model, function(err) {
            should.exist(err);
            Model.$table.delete = tmp;
            done();
          });
        });
        it('should got an null when $table.delete did not worked', function(done) {
          var tmp = Model.$table.delete;
          Model.$table.delete = function(model, cb) {
            cb(null, false);
          };
          Model.delete(model, function(err) {
            should.not.exist(err);
            Model.delete(model);
            Model.$table.delete = tmp;
            done();
          });
        });
        return context('when invoking with a model', function() {
          return it('should be succeed', function(done) {
            return Model['delete'](model, function(err, result) {
              should.exists(result);
              model.uniq = 0;
              return Model['delete'](model, function(err, result) {
                should.exist(result);
                return done();
              });
            });
          });
        });
      });
      describe('._cacheKey', function() {
        return it('should be ok', function() {
          var DefaultModel, defaultModel;
          DefaultModel = ModelFactory({
            tableName: 'binary_common_test',
            fields: [
              {
                name: 'bin',
                type: 'binary',
                pk: true
              },
              {
                unique: true,
                name: 'uniq'
              }
            ],
            indices: []
          });
          var SecondModel = ModelFactory({
            tableName: 'test2',
            fields: [
              {
                column: 'bin',
                type: 'binary',
                pk: true
              }
            ]
          });
          defaultModel = new DefaultModel({
            bin: new Buffer('a'),
            uniq: 9
          });
          var secModel = new SecondModel({
            bin: new Buffer('c'),
            uniq: 3
          });
          should.ok(DefaultModel._cacheKey(defaultModel));
          should.ok(DefaultModel._cacheKey(['', new Buffer('a')]));
          should.ok(SecondModel._cacheKey(secModel));
          should.ok(SecondModel._cacheKey({}));
          return should.ok(DefaultModel._cacheKey({}));
        });
      });
      return describe('.cleanCache', function() {
        return it('should be ok', function(done) {
          return Model.cleanCache('uniq', function(err, ret) {
            should.not.exist(err);
            return done();
          });
        });
      });
    });
    return describe('instanceMethods', function() {
      describe('.$initialize', function() {
        return it('should be nothing', function() {
          return should.not.exist(model.$initialize(model));
        });
      });
      describe('.toJSON', function() {
        return it('should return json', function() {
          return model.toJSON().should.be.ok();
        });
      });
      describe('.set', function() {
        return it('should be ok', function() {
          model.set().should.be.deepEqual(model);
          model.set({
            uniq: 2
          }).should.be.deepEqual(model);
          model.set({
            uniq: 2
          }, null).should.be.deepEqual(model);
          model.set({
            attributes: {
              uniq: 5
            }
          },
          {
            attributes: {
              non_uniq: 4
            }
          }).should.be.deepEqual(model);
          model.set('uniq', 'non_uniq', 'id').should.be.deepEqual(model);
          model.set(1).should.be.deepEqual(model);
          model.validate = function() {
            return false;
          };
          model.set('uniq', 8).should.be.deepEqual(model);
          model.validate = function() {
            return new Error();
          };
          model.once('error', (function() {}));
          return model.set('uniq', 5).should.be['false']();
        });
      });
      describe('.has', function() {
        return it('should be ok', function() {
          return model.has('uniq').should.Boolean();
        });
      });
      describe('.clone', function() {
        return it('should return a new instance', function() {
          return model.clone().constructor.should.be.deepEqual(model.constructor);
        });
      });
      describe('.hasChanged', function() {
        return it('should be ok', function() {
          var attrs;
          attrs = model._previousAttributes;
          model._previousAttributes = null;
          model.hasChanged().should.be['false']();
          model._previousAttributes = attrs;
          model.hasChanged('uniq').should.Boolean();
          return model.hasChanged().should.Boolean();
        });
      });
      describe('.previous', function() {
        return it('should return previousAttributes or null', function() {
          should.not.exist(model.previous());
          return model.previous('uniq').should.be.ok();
        });
      });
      describe('.previousAttributes', function() {
        return it('should return null or new previousAttributes', function() {
          var attrs;
          attrs = model._previousAttributes;
          model._previousAttributes = null;
          should.not.exist(model.previousAttributes());
          model._previousAttributes = attrs;
          return model.previousAttributes().should.be.ok();
        });
      });
      describe('._performValidation', function() {
        return it('should go to options.error when validation failed with a options.error argument', function() {
          return model._performValidation('uniq', {
            error: (function() {})
          }).should.be['false']();
        });
      });
      describe('.insert', function() {
        return it('should be ok', function(done) {
          return model.insert(function(err, result) {
            should.not.exists(err);
            return done();
          });
        });
      });
      describe('.update', function() {
        return it('should be ok', function(done) {
          return model.update(function(err, result) {
            should.not.exists(err);
            return done();
          });
        });
      });
      return describe('.delete', function() {
        return it('should be ok', function(done) {
          return model['delete'](function(err, result) {
            should.not.exists(err);
            return done();
          });
        });
      });
    });
  });

}).call(this);
