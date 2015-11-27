should = require 'should'
config = require '../conf/config'
database = require '../../lib/database'
cache = require('../../lib/cache').init()
db = database.getPool config.database
ModelGen = require('../../lib/model').init db: db, cache: cache

Model = ModelGen
  tableName: 'common_test'
  fields: [
    {
      name: 'non_uniq'
    }
    {
      unique: yes,
      name: 'uniq'
    }
    {
      pk: yes,
      name: 'id'
    }
  ]
  indices: []

model = new Model 'non_uniq': 1, 'uniq': 2, 'id': 2333

describe 'lib/common', ->
  before ->
    # create test table
    db.query 'create table `common_test` (`id` int NOT NULL, `uniq` int, `non_uniq` int, PRIMARY KEY (`id`))', [], (->)

  describe 'classMethods', ->

    # describe '.all', ->
    #   it 'should return the matched items', (done) ->
    #     Model.all (err, ret) ->
    #       should.not.exists err
    #       done()
    #
    # describe '.count', ->
    #   it 'should return the count of the matched items', (done) ->
    #     Model.count null, (err, count) ->
    #       should.not.exists err
    #       done()
    #
    #     Model.count {}, (err, count) ->
    #
    # describe '.find', ->
    #
    # describe '.findOne', ->
    #
    # describe '.findWithCount', ->
    #
    # describe '.findByIndex', ->
    #
    # describe '.findByUniqueKey', ->
    #
    # describe '.findById', ->
    #
    # describe '.findByIds', ->
    #
    # describe '._loadFromDB', ->
    #
    # describe '._newInstance', ->

    describe '._walk', ->
      it 'should return an array contains the method with specified prefix', ->
        Model.prototype.validateFoo = (callback) ->
          callback null
        Model.prototype.validateBar = (callback) ->
          callback null

        ret = Model._walk model, 'validate'
        ret.length.should.equal 2

    describe '.insert', ->
      it 'should got an error when invoking with a non-model object', (done) ->
        Model.insert {}, (err) ->
          should.exists err
          done()
      context 'when invoking with a model', ->
        it 'should be succeed', (done) ->
          Model.insert model, (err, result) ->
            should.exists result
            done()
        it 'should be fault when a validator test failed', (done) ->
          Model.prototype.validateErr = (callback) ->
            callback new Error
          Model.insert model, (err) ->
            should.exists err
            done()

        after -> delete Model.prototype.validateErr

    describe '.update', ->
      it 'should got an error when invoking with a non-model object', ->
        Model.update {}, (err) ->
          should.exists err
      context 'when invoking with a model', ->
        it 'should be succeed', (done) ->
          Model.update model, (err, result) ->
            should.exists result
            done()
        it 'should be fault when a validator test failed', (done) ->
          Model.prototype.validateErr = (callback) ->
            callback new Error
          Model.update model, (err) ->
            should.exists err
            done()

        after -> delete Model.prototype.validateErr

    describe '.delete', ->
      it 'should got an error when invoking with a non-model object', ->
        Model.delete {}, (err) ->
          should.exists err
      context 'when invoking with a model', ->
        it 'should be succeed', (done) ->
          Model.delete model, (err, result) ->
            should.exists result
            done()

    describe '.before', ->
      it 'should do nothing when add hooks on a non-supprot method', ->
        Model.before 'find', (->)
        Model._beforeHooks.find.length.should.equal 0
      it 'should be succeed when add a valid hook', ->
        Model.before 'insert', (done) ->
          done null
        should.exists Model._beforeHooks.insert

    describe '.after', ->
      it 'should do nothing when add hooks on a non-supprot method', ->
        Model.after 'find', (->)
        Model._afterHooks.find.length.should.equal 0
      it 'should be succeed when add a valid hook', ->
        Model.after 'insert', (done) ->
          done null
        should.exists Model._afterHooks.insert

    describe '._isValidMethod', ->
      it 'should only success when method name matchs insert or update or delete', ->
        should.ok Model._isValidMethod 'insert'
        should.ok Model._isValidMethod 'update'
        should.ok Model._isValidMethod 'delete'
        Model._isValidMethod('find').should.be.false()

    # describe '._cacheKey', ->
    #
    # describe '.cleanCache', ->

  describe 'instanceMethods', ->

    # describe '.$instance', ->
    #
    # describe '.toJSON', ->
    #
    # describe '.get', ->
    #
    # describe '.set', ->
    #
    # describe '.has', ->
    #
    # describe '.clear', ->
    #
    # describe '.clone', ->
    #
    # describe '.hasChanged', ->
    #
    # describe '.changedAttributes', ->
    #
    # describe '.previous', ->
    #
    # describe '.previousAttributes', ->
    #
    # describe '._performValidation', ->

    describe '.insert', ->
      it 'should be ok', (done) ->
        model.insert (err, result) ->
          should.not.exists err
          done()

    describe '.update', ->
      it 'should be ok', (done) ->
        model.update (err, result) ->
          should.not.exists err
          done()

    describe '.delete', ->
      it 'should be ok', (done) ->
        model.delete (err, result) ->
          should.not.exists err
          done()
