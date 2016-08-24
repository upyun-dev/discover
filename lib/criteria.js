// criteria.js 文件对 Criteria 类进行了描述

// Criteria 类是与 mysql 交互的接口
// 包含了对 SQL 操作的低层封装

var async = require('async');
var debug = require('debug')('discover:criteria');
var util = require('./util');
var Class = util.Class;

var AGAIN = new Error();

var criteriaInstMethods = {
  initialize: function(select, filter, orderBy, limit) {
    this.db = this.constructor.db;
    this.cache = this.constructor.cache;
    this._select = select;
    this._filter = filter;
    this._orderBy = orderBy;
    this._limit = limit;
  },

  clone: function() {
    return new this.constructor(this._select, this._filter, this.orderBy, this._limit, this.options);
  },

  where: function(filter) {
    this._filter = filter;
    return this;
  },

  limit: function(offset, limit) {
    if (offset === null) {
      this._limit = null;
    } else {
      this._limit = new this.constructor.Limit(offset, limit);
    }
    return this;
  },

  orderBy: function(column) {
    if (column === null) {
      this._orderBy = null;
    } else {
      this._orderBy = new this.constructor.OrderBy(column);
    }
    return this;
  },

  toSQL: function() {
    var sql = this._select.toSQL();
    var fields = this._select._model.$table.fields;

    var convertFilters = function(filters) {
      return filters.map(function(filter) {
        if (Array.isArray(filter)) {
          return convertFilters(filter);
        }

        if (filter.filters) {
          filter.filters = convertFilters(filter.filters);
        }
        else {
          filter.column = fields[filter.column].column;
        }
        return filter;
      });
    };

    if (this._filter) {
      if (this._filter.filters) {
        this._filter.filters = convertFilters(this._filter.filters);
      }
      else {
        this._filter.column = fields[this._filter.column].column;
      }
      sql += ' WHERE ' + this._filter.toSQL();
    }
    if (this._orderBy) {
      this._orderBy.column = fields[this._orderBy.column].column;
      sql += ' ' + this._orderBy.toSQL();
    }
    if (this._limit) sql += ' ' + this._limit.toSQL();
    return sql;
  },

  getArgs: function() {
    var args = this._filter ? this._filter.getArgs() : [];
    if (this._orderBy)
      args = args.concat(this._orderBy.getArgs());
    if (this._limit)
      args = args.concat(this._limit.getArgs());
    return util.flatten(args);
  },

  execute: function(opts, callback) {
    if ('function' === typeof opts) {
      callback = opts;
    }

    var self = this;
    var tries = 3;

    function query() {
      self._query(function(err, rows) {
        if (err) return callback(err);
        self._select.convertRows(rows, opts, function(err, objects) {
          if (err === AGAIN && tries--) return query();
          callback(err, objects);
        });
      });
    }
    query();

    return this;
  },

  _query: function(callback) {
    var sql = this.toSQL();
    var args = this.getArgs();

    debug('Discover> SQL: %s | Args: %s', sql, args);
    this.db.query(sql, args, function(err, rows, fields) {
      if (err) {
        debug('Database error: ' + err.message + ';\nSQL: ' + err.sql);
        return callback ? callback(err, rows) : null;
      }
      if (callback) callback(null, rows);
    });
    return this;
  }
};

var criteriaSelectInstMethods = {
  initialize: function(model) {
    this.cache = this.constructor.cache;
    this._model = model;
  },

  toSQL: function() {
    var table = this._model.$table;
    var cols = table.pks.map(function(f) { return '`' + f.column + '`'; }).join(', ');
    return 'SELECT ' + cols + ' FROM `' + table.name + '`';
  },

  convertRows: function(rows, opts, callback) {
    var self = this;
    var model = this._model;
    if (!rows || rows.length === 0) return callback(null, []);
    model.findByIds(rows, function(err, objects) {
      if (err) return callback(err);

      var missed = [];
      for (var i = 0, l = rows.length; i < l; i++) {
        if (objects[i] === null) {
          missed.push(rows[i]);
        }
      }
      if (missed.length) {
        var keys = missed.map(function(id) {return model._cacheKey(id);}, model);
        // delete cache again try again
        async.forEach(keys, function(key, done) {
          self.cache.del(key, function() { done(); });
        }, function() {
          callback(AGAIN);
        });
        /*
          Flow(keys)
          .parEach(5, function(key) {
          cache.del(key, this);
          })
          .seq(function() {
          callback(AGAIN);
          });
        */
      } else {
        callback(err, objects);
      }
    }, opts);
  }
};

var criteriaSelectIdInstMethods = {
  convertRows: function(rows, opts, callback) {
    callback(null, rows);
  }
};

var criteriaSelectCountInstMethods = {
  toSQL: function() {
    return 'SELECT COUNT(*) AS `count` FROM `' + this._model.$table.name + '`';
  },

  convertRows: function(rows, opts, callback) {
    if (!rows || rows.length === 0) return callback(null, 0);
    callback(null, Number(rows[0].count));
  }
};

var criteriaSelectMaxInstMethods = {
  initialize: function(model, column) {
    this._model = model;
    this._column = column;
  },

  toSQL: function() {
    return 'SELECT MAX(`' + this._column + '`) AS `max` FROM `' + this._model.$table.name + '`';
  },

  convertRows: function(rows, opts, callback) {
    if (!rows || rows.length === 0) return callback(null, 0);
    callback(null, rows[0].max);
  }
};

var criteriaSelectSumInstMethods = {
  initialize: function(model, columns) {
    this._model = model;
    this._columns = columns;
  },

  toSQL: function() {
    var fields = this._model.$table.fields;
    var sum = this._columns.map(function(column) {
      return 'SUM(`' + fields[column].column + '`) AS `' + column + '`';
    }).join(', ');
    return 'SELECT ' + sum + ' FROM `' + this._model.$table.name + '`';
  },

  convertRows: function(rows, opts, callback) {
    if (!rows || rows.length === 0) return callback(null, null);

    callback(null, rows[0]);
  }
};

var criteriaFilterInstMethods = {
  initialize: function(column, operator, value) {
    this.column = column;
    this.operator = operator;
    this.value = value;
  },

  /*
    limit: function(offset, limit) {
    var criteria = new Criteria(this);
    return citeria.limit(offset, limit);
    },

    orderBy: function(column) {
    var criteria = new Criteria(this);
    return criteria.orderBy(column);
    },
  */

  toSQL: function() {
    return '`' + this.column + '` ' + this.operator + ' ?';
  },

  getArgs: function() {
    return [this.value];
  }
};

var criteriaFilterNullInstMethods = {
  toSQL: function() {
    return '`' + this.column + '` IS NULL';
  },

  getArgs: function() {
    return [];
  }
};

var criteriaFilterNotNullInstMethods = {
  toSQL: function() {
    return '`' + this.column + '` IS NOT NULL';
  }
};

var criteriaFilterAndInstMethods = {
  $operator: 'AND',

  initialize: function() {
    this.filters = util.filter(util.flatten(util.toArray(arguments)), function(f) {return f;});
  },

  toSQL: function() {
    var sql = this.filters.map(function(f) { return f.toSQL(); }).join(' ' + this.$operator + ' ');
    if (this.filters.length > 1) sql = '(' + sql + ')';
    return sql;
  },

  getArgs: function() {
    var args = this.filters.map(function(f) { return f.getArgs(); });
    return util.flatten(args);
  }
};

var criteriaLimitInstMethods = {
  initialize: function(offset, limit) {
    this._offset = offset;
    this._count = limit;
    if (!limit) {
      this._offset = false;
      this._count = offset;
    }
  },

  toSQL: function() {
    var sql = 'LIMIT';
    if (this._offset || this._offset === 0) {
      sql += ' ?, ?';
    } else {
      sql += ' ?';
    }
    return sql;
  },

  getArgs: function() {
    var args = null;
    if (this._offset || this._offset === 0) {
      args = [this._offset, this._count];
    } else {
      args = [this._count];
    }
    return args;
  }
};

var criteriaOrderByInstMethods = {
  initialize: function(column) {
    this.column = column;
    this.desc = false;

    if (typeof column === 'object') {
      this.column = Object.keys(column)[0];
      this.desc = column[this.column] == 'desc';
    }
  },

  toSQL: function() {
    var sql = 'ORDER BY `' + this.column + '`';
    if (this.desc) sql += ' DESC';
    else sql += ' ASC';
    return sql;
  },

  getArgs: function() {
    return [];
  }
};

var criteriaClassMethods = {
  select: function(model) {
    return new this(new this.Select(model));
  },

  id: function(model) {
    return new this(new this.Select.Id(model));
  },

  count: function(model) {
    return new this(new this.Select.Count(model));
  },

  max: function(model, column) {
    return new this(new this.Select.Max(model, column));
  },

  sum: function(model, columns) {
    return new this(new this.Select.Sum(model, columns));
  },

  and: function() {
    return new this.Filter.AND(util.toArray(arguments));
  },

  or: function() {
    return new this.Filter.OR(util.toArray(arguments));
  },

  like: function(column, value) {
    return new this.Filter(column, 'like', value);
  },

  eq: function(column, value) {
    return new this.Filter(column, '=', value);
  },

  neq: function(column, value) {
    return new this.Filter(column, '<>', value);
  },

  gt: function(column, value) {
    return new this.Filter(column, '>', value);
  },

  gte: function(column, value) {
    return new this.Filter(column, '>=', value);
  },

  lt: function(column, value) {
    return new this.Filter(column, '<', value);
  },

  lte: function(column, value) {
    return new this.Filter(column, '<=', value);
  },

  isNull: function(column) {
    return new this.Filter.Null(column);
  },

  isNotNull: function(column) {
    return new this.Filter.NotNull(column);
  }
};

function init(options) {
  // 分配新的 Criteria 类
  // 添加 Criteria 类原型方法
  var Criteria = new Class(criteriaInstMethods);

  // 添加 Select 类原型方法
  Criteria.Select = new Class(criteriaSelectInstMethods);

  // 添加 Select 子类原型方法
  criteriaSelectIdInstMethods.Extends =
    criteriaSelectCountInstMethods.Extends =
    criteriaSelectMaxInstMethods.Extends =
    criteriaSelectSumInstMethods.Extends =
    Criteria.Select;
  Criteria.Select.Id = new Class(criteriaSelectIdInstMethods);
  Criteria.Select.Count = new Class(criteriaSelectCountInstMethods);
  Criteria.Select.Max = new Class(criteriaSelectMaxInstMethods);
  Criteria.Select.Sum = new Class(criteriaSelectSumInstMethods);

  // 添加 Filter 类原型方法
  Criteria.Filter = new Class(criteriaFilterInstMethods);

  // 添加 Filter 子类原型方法
  criteriaFilterNullInstMethods.Extends =
    criteriaFilterNotNullInstMethods.Extends =
    criteriaFilterAndInstMethods.Extends =
    Criteria.Filter;
  Criteria.Filter.Null = new Class(criteriaFilterNullInstMethods);
  Criteria.Filter.NotNull = new Class(criteriaFilterNotNullInstMethods);
  Criteria.Filter.AND = new Class(criteriaFilterAndInstMethods);
  Criteria.Filter.OR = new Class({
    Extends: Criteria.Filter.AND,
    $operator: 'OR'
  });

  Criteria.Limit = new Class(criteriaLimitInstMethods);

  Criteria.OrderBy = new Class(criteriaOrderByInstMethods);

  // 添加 Criteria 类静态方法
  util.extend(Criteria, criteriaClassMethods);

  /* istanbul ignore else */
  if (process.env.NODE_ENV === 'test') {
    Criteria.AGAIN = AGAIN;
  }

  // 为需要 db/cache 操作的类挂载资源
  Criteria.db = options.db;
  Criteria.cache = Criteria.Select.cache = options.cache;

  return Criteria;
}

exports.init = init;
