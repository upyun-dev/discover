var should = require('should');
var config = require('../conf/config');
var database = require('../../lib/database');
var db = database.getPool(config.database);
var cache = require('../../lib/cache').init();

var Criteria = require('../../lib/criteria').init({
  db: db,
  cache: cache
});
var ModelFactory = require('../../lib/model').init({
  db: db,
  cache: cache
});
var Model = ModelFactory({
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

var select = new Criteria.Select(Model);
var filter = new Criteria.Filter(['uniq', 'non_uniq'], 'gt', '5');
var criteria = new Criteria(select, filter);

describe('criteria.js', function() {
  describe('.clone', function() {
    it('should return a new instance of Criteria', function() {
      criteria.clone().constructor.should.deepEqual(Criteria);
    });
  });
  describe('.limit', function() {
    it('_limit should be null when pass an null offset', function() {
      criteria.limit(null);
      should.not.exist(criteria._limit);
    });
  });
  describe('.orderBy', function() {
    it('_orderBy should be null when pass an null column', function() {
      criteria.orderBy(null);
      should.not.exist(criteria._orderBy);
    });
  });
  describe('.toSQL', function() {
    it('should be ok when _filter.filters is an embed array', function(done) {
      criteria._filter = criteria._filter || {};
      var tmpFilter = criteria._filter.filters;
      criteria._filter.filters = [
        [{
          filters: []
        }]
      ];
      criteria.toSQL().should.be.ok();
      var db = Criteria.db;
      var tmpQuery = db.query;
      db.query = function(sql, args, callback) {
        callback(new Error(), []);
      };
      criteria._query(function(err) {
        should.exist(err);
        Criteria.db.query = tmpQuery;
        criteria._filter.filters = tmpFilter;
        done();
      });
    });
  });
  describe('.execute', function() {
    it('should get an error on callback', function(done) {
      var tmp = criteria._query;
      criteria._query = function(callback) {
        callback(Criteria.AGAIN);
      };
      criteria.execute(function(err) {
        should.exist(err);
        criteria._query = tmp;
        done();
      });
    });

    it('should query again when err is AGAINs', function(done) {
      var tmpQuery = criteria._query;
      criteria._query = function(callback) {
        callback(null);
      };
      var tmp = criteria._select.convertRows;
      criteria._select.convertRows = function(rows, opts, callback) {
        callback(Criteria.AGAIN);
      };
      criteria.execute(function(err) {
        should.exist(err);
        criteria._query = tmpQuery;
        criteria._select.convertRows = tmp;
        done();
      });
    });
  });
  describe('_query', function() {
    context('when callback not provide', function() {
      it('should be ok when db.query failed', function() {
        var tmpSql = criteria.toSQL;
        var tmpArgs = criteria.getArgs;
        var tmpQuery = Criteria.db.query;
        criteria.toSQL = function() {};
        criteria.getArgs = function() {};
        Criteria.db.query = function(sql, args, callback) {
          callback(new Error());
        };
        criteria._query().should.be.ok();
        criteria.toSQL = tmpSql;
        criteria.getArgs = tmpArgs;
        Criteria.db.query = tmpQuery;
      });
      it('should be ok when db.query success', function() {
        var tmpSql = criteria.toSQL;
        var tmpArgs = criteria.getArgs;
        var tmpQuery = Criteria.db.query;
        criteria.toSQL = function() {};
        criteria.getArgs = function() {};
        Criteria.db.query = function(sql, args, callback) {
          callback(null);
        };
        criteria._query().should.be.ok();
        criteria.toSQL = tmpSql;
        criteria.getArgs = tmpArgs;
        Criteria.db.query = tmpQuery;
      });
    });
  });

  describe('Criteria.Select', function() {
    var select = new Criteria.Select(Model);
    describe('.convertRows', function() {
      it('should be ok', function(done) {
        select.convertRows([1, 2, 3], {}, function(msg) {
          should.exist(msg);
          done();
        });
      });
      it('should got an error when model.findByIds failed', function(done) {
        var tmp = select._model.findByIds;
        select._model.findByIds = function(rows, callback) {
          callback(new Error());
        };
        select.convertRows([1, 2, 3], {}, function(err) {
          should.exist(err);
          select._model.findByIds = tmp;
          done();
        });
      });
    });
  });
  describe('Criteria.Select.Id', function() {
    var id = new Criteria.Select.Id(Model);
    describe('.convertRows', function() {
      it('should be ok and return the original rows', function(done) {
        var rows = [1, 2, 3];
        id.convertRows(rows, {}, function(err, rows) {
          should.not.exist(err);
          rows.should.deepEqual(rows);
          done();
        });
      });
    });
  });
  describe('Criteria.Select.Max', function() {
    var max = new Criteria.Select.Max(Model, 'uniq');
    describe('initialize', function() {
      it('should return a new instance of Max', function() {
        max.constructor.should.deepEqual(Criteria.Select.Max);
      });
    });
    describe('toSQL', function() {
      it('should return the SQL syntax', function() {
        max.toSQL().should.equal('SELECT MAX(`' + max._column + '`) AS `max` FROM `' + max._model.$table.name + '`');
      });
    });
    describe('convertRows', function() {
      it('should be ok and return the max of the row[0]', function(done) {
        max.convertRows([{
          max: 9
        }], {}, function(err, rowMax) {
          should.not.exist(err);
          rowMax.should.equal(9);
          done();
        });
      });
      it('should return 0 when the rows isnt exist or empty', function(done) {
        max.convertRows(null, {}, function(err, counts) {
          should.not.exist(err);
          counts.should.equal(0);
          max.convertRows([], {}, function(err, counts) {
            should.not.exist(err);
            counts.should.equal(0);
            done();
          });
        });
      });
    });
  });
  describe('Criteria.Select.Count', function() {
    var count = new Criteria.Select.Count(Model);
    describe('.convertRows', function() {
      it('should return 0 when the rows isnt exist or empty', function(done) {
        count.convertRows(null, {}, function(err, counts) {
          should.not.exist(err);
          counts.should.equal(0);
          count.convertRows([], {}, function(err, counts) {
            should.not.exist(err);
            counts.should.equal(0);
            done();
          });
        });
      });
    });
  });
  describe('Criteria.Select.Sum', function() {
    var sum = new Criteria.Select.Sum(Model, ['uniq', 'non_uniq']);
    describe('initialize', function() {
      it('should return the new instance of Sum', function() {
        sum.constructor.should.deepEqual(Criteria.Select.Sum);
      });
    });
    describe('toSQL', function() {
      it('should return the same SQL syntax', function() {
        sum.toSQL().should.equal(sum.toSQL());
      });
    });
    describe('convertRows', function() {
      it('should be ok and return the row[0]', function(done) {
        sum.convertRows([1, 2, 3], {}, function(err, row) {
          should.not.exist(err);
          row.should.equal(1);
          done();
        });
      });
      it('should return null when the rows isnt exist or empty', function(done) {
        sum.convertRows(null, {}, function(err, counts) {
          should.not.exist(err);
          should.not.exist(counts);
          sum.convertRows([], {}, function(err, counts) {
            should.not.exist(err);
            should.not.exist(counts);
            done();
          });
        });
      });
    });
  });
  describe('Criteria.Limit', function() {
    var limit = new Criteria.Limit();
    it('should be ok when limit is null', function() {
      limit.should.be.ok();
    });
    describe('.toSQL', function() {
      it('should be ok if _offset does not exist', function() {
        limit.toSQL().should.be.ok();
      });
    });
    describe('.getArgs', function() {
      it('should be ok', function() {
        limit.getArgs().should.be.ok();
      });
    });
  });
  describe('Criteria.OrderBy', function() {
    var orderBy = new Criteria.OrderBy();
    describe('toSQL', function() {
      it('should be ok', function() {
        orderBy.toSQL().should.be.ok();
      });
    });
  });
  describe('Criteria.Filter.Null', function() {
    var nul = new Criteria.Filter.Null('uniq');
    describe('toSQL', function() {
      it('should return the SQL syntax', function() {
        nul.toSQL().should.equal('`' + nul.column + '` IS NULL');
      });
    });
    describe('getArgs', function() {
      it('should return an empty array', function() {
        nul.getArgs().should.be.empty();
      });
    });
  });
  describe('Criteria.Filter.NotNull', function() {
    var notNull = new Criteria.Filter.NotNull('uniq');
    describe('toSQL', function() {
      it('should return the SQL syntax', function() {
        notNull.toSQL().should.equal('`' + notNull.column + '` IS NOT NULL');
      });
    });
  });
  describe('Criteria.id', function() {
    it('should return the new instance of Criteria', function() {
      Criteria.id(Model).constructor.should.deepEqual(Criteria);
    });
  });
  describe('Criteria.max', function() {
    it('should return the new instance of Criteria', function() {
      Criteria.max(Model).constructor.should.deepEqual(Criteria);
    });
  });
  describe('Criteria.sum', function() {
    it('should return the new instance of Criteria', function() {
      Criteria.sum(Model).constructor.should.deepEqual(Criteria);
    });
  });
  describe('Criteria.or', function() {
    it('should return the new instance of Criteria.Filter.OR', function() {
      Criteria.or(Model).constructor.should.deepEqual(Criteria.Filter.OR);
    });
  });
  describe('Criteria.not', function() {
    it('should return the new instance of Criteria.Filter.NOT', function() {
      Criteria.not(Model).constructor.should.deepEqual(Criteria.Filter.NOT);
    });
  });
  describe('Criteria.xor', function() {
    it('should return the new instance of Criteria.Filter.XOR', function() {
      Criteria.xor(Model).constructor.should.deepEqual(Criteria.Filter.XOR);
    });
  });
  describe('Criteria.like', function() {
    it('should return the new instance of Criteria.Filter', function() {
      Criteria.like(Model).constructor.should.deepEqual(Criteria.Filter);
    });
  });
  describe('Criteria.neq', function() {
    it('should return the new instance of Criteria.Filter', function() {
      Criteria.neq(Model).constructor.should.deepEqual(Criteria.Filter);
    });
  });
  describe('Criteria.gt', function() {
    it('should return the new instance of Criteria.Filter', function() {
      Criteria.gt(Model).constructor.should.deepEqual(Criteria.Filter);
    });
  });
  describe('Criteria.gte', function() {
    it('should return the new instance of Criteria.Filter', function() {
      Criteria.gte(Model).constructor.should.deepEqual(Criteria.Filter);
    });
  });
  describe('Criteria.lt', function() {
    it('should return the new instance of Criteria.Filter', function() {
      Criteria.lt(Model).constructor.should.deepEqual(Criteria.Filter);
    });
  });
  describe('Criteria.lte', function() {
    it('should return the new instance of Criteria.Filter', function() {
      Criteria.lte(Model).constructor.should.deepEqual(Criteria.Filter);
    });
  });
  describe('Criteria.isNull', function() {
    it('should return the new instance of Criteria.Filter.Null', function() {
      Criteria.isNull(Model).constructor.should.deepEqual(Criteria.Filter.Null);
    });
  });
  describe('Criteria.isNotNull', function() {
    it('should return the new instance of Criteria.Filter.NotNull', function() {
      Criteria.isNotNull(Model).constructor.should.deepEqual(Criteria.Filter.NotNull);
    });
  });
});
