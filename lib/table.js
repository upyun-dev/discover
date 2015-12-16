var logger = require('./log');
var util = require('./util');
var Class = util.Class;

/**
 * Table: handle database operations
 **/
var Table = new Class({
  initialize: function(name, fields, db) {
    this.db = db;
    this.name = name;
    this.allFields = fields;
    this.fields = {};
    this.pks = [];
    this.columns = [];
    this.autoField = null;
    this.nonAutoFields = [];
    this.nonPKFields = [];
    this.defaults = {};

    util.each(fields, function(f) {
      // 兼容老的数据结构
      if (!f.column) f.column = f.name;

      // 新数据结构下，不定义name的时候采用column作为默认的别名
      if (!f.name && f.column) f.name = f.column;

      this.fields[f.name] = f;
      this.columns.push(f.column);
      if (f.pk) this.pks.push(f);
      else this.nonPKFields.push(f);
      if (f.auto) this.autoField = f;
      else this.nonAutoFields.push(f);
      this.defaults[f.name] = util.isUndefined(f.default) ? null : f.default;
    }, this);

    this._sqls = {};
  },

  findById: function(id, callback) {
    var sql = this._sqlLoad();
    var args = null;
    if (Array.isArray(id) && this.pks.length === id.length) {
      args = util.clone(id);
    } else if (util.isObject(id)) {
      args = this.pks.map(function(f) { return id[f.column] || id[f.name]; })
        .filter(function(v) { return !util.isUndefined(v); });
    } else if (this.pks.length === 1) {
      args = [id];
    }

    if (!args || args.length !== this.pks.length) return callback(new Error('Invalid id arguments'));

    logger.debug('Discover> SQL: %s | Args: %s', sql, args);
    args = this.pks.map(function(f, idx) {
      if (f.type !== 'hash') return args[idx];
      return f.toDB(args[idx]);
    });
    this.db.query(sql, args, function(err, rows, fields) {
      if (err) return callback ? callback(err, null) : null;
      if (rows.length > 0) {
        if (callback) callback(null, rows[0]);
      } else {
        if (callback) callback(null, null);
      }
    });
    return this;
  },

  insert: function(model, callback) {
    var self = this;
    var sql = this._sqlInsert();
    var args = this.nonAutoFields.map(function(f) { return f.toDB(model.get(f.name)); });

    logger.debug('Discover> SQL: %s | Args: %s', sql, args);

    this.db.query(sql, args, function(err, info) {
      if (err) {
        logger.error('Database error: ' + err.message + ';\nSQL: ' + err.sql);
        return callback ? callback(err, info) : null;
      }
      if (self.autoField) model.set(self.autoField.name, info.insertId, { silent: true });
      model.clear();
      if (callback) callback(null, model);
    });
    return this;
  },

  delete: function(model, callback) {
    var sql = this._sqlDelete();
    var args = this.pks.map(function(f) { return f.toDB(model.get(f.name)); });

    logger.debug('Discover> SQL: %s | Args: %s', sql, args);

    this.db.query(sql, args, function(err, info) {
      if (err) {
        logger.error('Database error: ' + err.message + ';\nSQL: ' + err.sql);
        return callback ? callback(err, info) : null;
      }
      model.clear();
      if (callback) callback(null, true);
    });
    return this;
  },

  update: function(model, callback) {
    var self = this;
    var attrs = model.changedAttributes();
    if (!attrs || util.isEmpty(attrs)) {
      if (callback) callback(null, false);
      return this;
    }

    var args = {};
    this.nonPKFields.forEach(function(f) {
      if (attrs[f.name] !== void 0) args[f.name] = f.toDB(attrs[f.name]);
    });

    if (util.isEmpty(args)) {
      if (callback) callback(null, false);
      return this;
    }

    var sql = 'UPDATE `' + this.name + '` SET ' +
        util.map(args, function(v, k) {
          return '`' + self.fields[k].column + '` = ?';
        }).join(', ');
    var condition = this.pks.map(function(f) { return '`' + f.column + '` = ?'; }).join(' AND ');
    sql += ' WHERE ' + condition;

    args = util.values(args);
    this.pks.forEach(function(f) { args.push(f.toDB(model.get(f.name))); });

    logger.debug('Discover> SQL: %s | Args: %s', sql, args);

    this.db.query(sql, args, function(err, info) {
      if (err) {
        logger.error('Database error: ' + err.message + ';\nSQL: ' + err.sql);
        return callback ? callback(err, info) : null;
      }
      model.clear();
      if (callback) callback(null, true);
    });
    return this;
  },

  _sqlLoad: function() {
    if (!this._sqls.load) {
      var cols = this.allFields.map(function(f) { return '`' + f.column + '`'; }).join(', ');
      var condition = this.pks.map(function(f) { return '`' + f.column + '` = ?'; }).join(' AND ');
      this._sqls.load = 'SELECT ' + cols + ' FROM `' + this.name + '` WHERE ' + condition;
    }
    return this._sqls.load;
  },

  _sqlDelete: function() {
    if (!this._sqls['delete']) {
      var condition = this.pks.map(function(f) { return '`' + f.column + '` = ?'; }).join(' AND ');
      this._sqls['delete'] = 'DELETE FROM `' + this.name + '` WHERE ' + condition;
    }
    return this._sqls['delete'];
  },

  _sqlInsert: function() {
    if (!this._sqls.insert) {
      var cols = this.nonAutoFields.map(function(f) { return '`' + f.column + '`'; }).join(', ');
      var placeholder = util.range(this.nonAutoFields.length).map(function() { return '?'; }).join(', ');
      this._sqls.insert = 'INSERT INTO `' + this.name + '` (' + cols + ') VALUES (' + placeholder + ')';
    }
    return this._sqls.insert;
  }
});


module.exports = Table;
