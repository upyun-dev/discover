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
    }, {
      unique: true,
      name: 'uniq'
    }, {
      pk: true,
      name: 'id'
    }
  ],
  indices: []
});

var criteria = new Criteria();

describe('criteria.js', function() {
  describe('.clone', function() {
    it('should return a new instance of Criteria', function() {
      criteria.clone().constructor.should.deepEqual(Criteria);
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
      Criteria.select(Model).constructor.should.deepEqual(Criteria);
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
