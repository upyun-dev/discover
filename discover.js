var EventEmitter = require('events').EventEmitter;
var crypto = require('crypto');

var async = require('async');
var bignum = require('bignumber.js');
var logger = require('ulogger').createLogger('discover');
var moment = require('moment');

var util = require('./util');
var Class = util.Class;

var database = require('./database');
var cachelib = require('./cache');


var AGAIN = new Error();

var tables = {};
var fieldTypes = {};

var Field = new Class({
    initialize: function(attrs){
        util.extend(this, attrs);
    },

    toDB: function(val) {
        return val;
    },

    fromDB: function(val) {
        return val;
    },

    defaultValue: function() {
        return null;
    }
});

var JSONField = fieldTypes['json'] = new Class({
    Extends: Field,

    toDB: function(val) {
        if (val === undefined || val === null) {
            return val;
        }
        return JSON.stringify(val);
    },

    fromDB: function(val) {
        if (val === undefined || val === null) {
            return val;
        }
        try {
            return JSON.parse(val.toString());
        } catch(e) {
            return null;
        }
    },

    defaultValue: function() {
        return {};
    }
});

var IntField = fieldTypes['int'] = new Class({
    Extends: Field,

    defaultValue: function() {
        return 0;
    }
});

var DateField = fieldTypes['date'] = new Class({
    Extends: Field,

    fromDB: function(val) {
        if (val === undefined || val === null) {
            return val;
        }
        return moment(val).toDate();
    },

    toDB: function(val) {
        if (val === undefined || val === null) {
            return val;
        }
        return moment(val).format('YYYY-MM-DD HH:mm:ss');
    },

    defaultValue: function() {
        return new Date();
    }
});

var DateTimeField = fieldTypes['datetime'] = DateField;
var TimeStampField = fieldTypes['timestamp'] = DateField;


var createField = function(define) {
    var FieldType = fieldTypes[define.type] || Field;
    return new FieldType(define);
};

function Discover(db_cfg, cache_cfg) {
    var db = database.getPool(db_cfg);

    // exports database connection
    exports.getDatabase = function() {
        return db;
    };

    var cache = null;
    if (cache_cfg) {
        cache = cachelib.init(cache_cfg.servers, cache_cfg.options);
    }
    else {
        cache = {
            get: function(key, callback) {
                callback(null, []);
            },
            del: function(key, callback) {
                callback(null, null);
            },
            set: function(key, val, expire, callback) {
                callback(null, null);
            }
        };
    }


    /**
     * Table: handle database operations
     **/
    var Table = new Class({/*{{{*/
        initialize: function(name, fields){
            this.name = name;
            this.allFields = fields;
            this.fields = {};
            this.pks = [];
            this.columns = [];
            this.autoField = null;
            this.nonAutoFields = [];
            this.nonPKFields = [];
            this.defaults = {};

            util.each(fields, function(f){
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
                args = this.pks.map(function(f){ return id[f.column] || id[f.name]; })
                               .filter(function(v){ return !util.isUndefined(v); });
            } else if (this.pks.length === 1) {
                args = [id];
            }

            if (!args || args.length !== this.pks.length) return callback(new Error('Invalid id arguments'));

            logger.debug('Discover> SQL: %s | Args: %s', sql, args);

            args = this.pks.map(function(f, idx) {
                if (f.type !== 'hash') return args[idx];
                return f.toDB(args[idx]);
            });
            db.query(sql, args, function(err, rows, fields){
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
            var args = this.nonAutoFields.map(function(f){ return f.toDB(model.get(f.name)); });

            logger.debug('Discover> SQL: %s | Args: %s', sql, args);

            db.query(sql, args, function(err, info){
                if (err) {
                    logger.error("Database error: " + err.message + ";\nSQL: " + err.sql);
                    return callback ? callback(err, info) : null;
                }
                if (self.autoField) model.set(self.autoField.name, info.insertId, {silent: true});
                model.clear();
                if (callback) callback(null, model);
            });
            return this;
        },

        delete: function(model, callback) {
            var self = this;
            var sql = this._sqlDelete();
            var args = this.pks.map(function(f){ return f.toDB(model.get(f.name)); });

            logger.debug('Discover> SQL: %s | Args: %s', sql, args);

            db.query(sql, args, function(err, info){
                if (err) {
                    logger.error("Database error: " + err.message + ";\nSQL: " + err.sql);
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
            this.nonPKFields.forEach(function(f){
                if (attrs[f.name] !== void 0) args[f.name] = f.toDB(attrs[f.name]);
            });

            if (util.isEmpty(args)) {
                if (callback) callback(null, false);
                return this;
            }

            var sql = 'UPDATE `' + this.name + '` SET '
                    + util.map(args, function(v, k){
                        return '`' + self.fields[k].column + '` = ?';
                    }).join(', ');
            var condition = this.pks.map(function(f){ return '`' + f.column + '` = ?'; }).join(' AND ');
            sql += ' WHERE ' + condition;

            args = util.values(args);
            this.pks.forEach(function(f){ args.push(f.toDB(model.get(f.name))); });

            logger.debug('Discover> SQL: %s | Args: %s', sql, args);

            db.query(sql, args, function(err, info){
                if (err) {
                    logger.error("Database error: " + err.message + ";\nSQL: " + err.sql);
                    return callback ? callback(err, info) : null;
                }
                model.clear();
                if (callback) callback(null, true);
            });
            return this;
        },

        _sqlLoad: function(){
            if (!this._sqls['load']) {
                var cols = this.allFields.map(function(f){ return '`' + f.column + '`'; }).join(', ');
                var condition = this.pks.map(function(f){ return '`' + f.column + '` = ?'; }).join(' AND ');
                this._sqls['load'] = 'SELECT ' + cols + ' FROM `' + this.name + '` WHERE ' + condition;
            }
            return this._sqls['load'];
        },

        _sqlDelete: function(){
            if (!this._sqls['delete']) {
                var condition = this.pks.map(function(f){ return '`' + f.column+ '` = ?'; }).join(' AND ');
                this._sqls['delete'] = 'DELETE FROM `' + this.name + '` WHERE ' + condition;
            }
            return this._sqls['delete'];
        },

        _sqlInsert: function(){
            if (!this._sqls['insert']) {
                var cols = this.nonAutoFields.map(function(f){ return '`' + f.column+ '`'; }).join(', ');
                var placeholder = util.range(this.nonAutoFields.length).map(function(){ return '?'; }).join(', ');
                this._sqls['insert'] = 'INSERT INTO `' + this.name + '` (' + cols + ') VALUES (' + placeholder + ')';
            }
            return this._sqls['insert'];
        }
    });/*}}}*/

    var classMethods = {/*{{{*/
        all: function(callback, opts) {
            Q.select(this).execute(opts, callback);
        },

        findByIndex: function(index, val, callback, opts) {
            Q.select(this).where(Q.eq(index, val)).execute(opts, callback);
        },

        findByUniqueKey: function(key, val, callback, opts) {
            this.findByIndex(key, val, function(err, entities){
                if (err) return callback(err, entities);
                var result = (entities && entities.length > 0) ? entities[0] : null;
                callback(null, result);
            }, opts);
        },

        findById: function(id, callback, opts) {
            this.findByIds([id], function(err, objs){
                if (err) return callback(err);
                if (objs.length) callback(null, objs[0]);
                else callback(null, null);
            }, opts);
        },

        findByIds: function(ids, callback, opts) {
            if (!Array.isArray(ids)) {
                throw new Error("First argument to findByIds must be an array of ids");
            }
            if (ids.length === 0) return callback(null, []);

            var self = this;
            var keys = ids.map(function(id){return self._cacheKey(id)});

            function wraps(rows) {
                var objs = keys.map(function(key){
                    var obj = self._newInstance(rows[key]);
                    if (obj && opts && opts.json) obj = obj.toJSON(opts.secure);
                    return obj;
                });
                callback(null, objs);
            }

            cache.get(keys, function(err, rows){
                if (err) logger.error('Memcached error: %s', String(err));
                var missed = null;
                for (var i = 0, l = keys.length; i < l; i++) {
                    if (rows[keys[i]] === undefined) {
                        if (!missed) missed = [];
                        missed.push([[keys[i]], ids[i]]);
                    }
                }
                if (missed && missed.length) {
                    async.forEachLimit(missed, 10, function(kid, done){
                        self._loadFromDB(kid[1], function(err, row){
                            if (err) return done(err);
                            rows[kid[0]] = row;
                            done();
                        });
                    }, function(err){
                        if (err) return callback(err);
                        wraps(rows);
                    });
                } else {
                    wraps(rows);
                }
            });
        },

        _loadFromDB: function(id, callback) {
            var key = this._cacheKey(id);

            this.$table.findById(id, function(err, row){
                if (err) return callback(err, row);
                if (row) {
                    cache.set(key, row, 0, function(err, done){
                        callback(null, row);
                    });
                } else {
                    //cache.set(key, null, 0, function(err, done){
                    callback(null, null);
                    //});
                }
            });
        },

        _newInstance: function(data, raw) {
            if (!data) return null;
            var fields = this.$table.fields;
            var columns = this.$table.columns;
            var row = {};
            for (var name in fields) {
                var f = fields[name];
                var v = Object.prototype.hasOwnProperty.call(data, f.column) ? data[f.column] : (
                    Object.prototype.hasOwnProperty.call(f, 'default') ? f['default'] : f.defaultValue());
                columns.push(f.column);
                row[f.name] = f.fromDB(v);
            }
            for (var k in data) {
                if (!fields[k] && columns.indexOf(k) < 0) row[k] = data[k];
            }
            if (raw) return row;
            return new this(row);
        },

        insert: function(model, callback) {
            if (!isEntity(model)) {
                if (callback) callback(new Error('Can not insert non-model object'));
                return this;
            }
            var self = this;

            this.$table.insert(model, function(err, result){
                if (err) return callback ? callback(err, result) : null;
                cache.del(self._cacheKey(result), function(err, done){
                    if (callback) callback(null, result);
                });
            });
            return this;
        },

        update: function(model, callback) {
            if (!isEntity(model)) {
                if (callback) callback(new Error('Can not update non-model object'));
                return this;
            }
            var self = this;

            this.$table.update(model, function(err, updated){
                if (err) return callback ? callback(err, updated) : null;
                if (updated) {
                    cache.del(self._cacheKey(model), function(err, done){
                        if (callback) callback(null, model);
                    });
                } else {
                    if (callback) callback(null, model);
                }
            });
            return this;
        },

        delete: function(model, callback) {
            if (!isEntity(model)) {
                if (callback) callback(new Error('Can not delete non-model object'));
                return this;
            }
            var self = this;
            this.$table.delete(model, function(err, deleted){
                if (err) return callback ? callback(err, deleted) : null;
                if (deleted) {
                    cache.del(self._cacheKey(model), function(err, done){
                        if (callback) callback(null, model);
                    });
                } else {
                    if (callback) callback(null, model);
                }
            });
            return this;
        },

        _cacheKey: function(val) {
            var id = '';
            if (isEntity(val)) {
                id = this.$table.pks.map(function(f){
                    if (f.type !== 'binary') {
                        return String(val.get(f.name || f.column));
                    }

                    return val.get(f.name || f.column).toString('hex');
                }).join('-');
            } else if (Array.isArray(val)) {
                id = val.map(function(v){
                    if (Buffer.isBuffer(v)) return v.toString('hex');

                    return String(v);
                }).join('-');
            } else if (util.isObject(val)) {
                id = this.$table.pks.map(function(f){
                  if (f.type !== 'binary') {
                      return String(val[f.name] || val[f.column]);
                  }

                  return String(val[f.name || f.column]).toString('hex');
                }).join('-');
            } else {
                id = val;
            }

            return crypto.createHash('md5').update(this.$table.name + ':' + id, 'utf8').digest('hex');
        },

        cleanCache: function(val, callback) {
            cache.del(this._cacheKey(val), callback);
        }
    };/*}}}*/

    var Model = exports.Model = function(params, db_){//{{{
        params.fields || (params.fields = []);

        var fields = [], indices = params.indices || [];

        for (var i = 0, l = params.fields.length; i < l; i++) {
            var f = params.fields[i];
            fields.push(createField(f));
            if (f.index || f.unique) indices.push(f);
        }

        var tableName = params.tableName;
        var table = tables[tableName] = new Table(tableName, fields);

        delete params.fields;
        delete params.indices;
        delete params.tableName;

        var newModel = function(){
            this.$model = newModel;
            this.$initialize.apply(this, arguments);
            var value = (this.initialize) ? this.initialize.apply(this, arguments) : this;
            EventEmitter.call(this);
            return value;
        }
        newModel.$table = table;
        newModel.$constructor = Model;

        util.inherits(newModel, EventEmitter);
        util.extend(newModel, classMethods);

        util.each(indices, function(f){
            var fieldName = f.name;
            var funcName = 'findBy' + fieldName.replace(/\b[a-z]/g, function(match){
                return match.toUpperCase();
            }).replace(/_\D/g, function(match){
                return match.charAt(1).toUpperCase();
            });
            if (newModel[funcName]) return;
            newModel[funcName] = function(){
                var args = util.toArray(arguments);
                args.unshift(fieldName);
                return this[f.unique ? 'findByUniqueKey' : 'findByIndex'].apply(this, args);
            };
        });

        var proto = newModel.prototype;
        proto.$constructor = newModel;

        util.extend(proto, instanceMethods);
        util.extend(proto, params);

        util.each(fields, function(f){
            var fieldName = f.name;
            if (fieldName != 'domain') {
                proto.__defineGetter__(fieldName, function(){
                    return this.get(fieldName);
                });
                proto.__defineSetter__(fieldName, function(value){
                    return this.set(fieldName, value);
                });
            }
        });

        return newModel;
    };//}}}

    var isEntity = exports.isEntity = function(model) {//{{{
        if (!model) return false;
        return model.$model !== undefined;
    };//}}}

    var instanceMethods = {/*{{{*/
        $initialize: function(attributes, options) {
            attributes || (attributes = {});

            if (isEntity(attributes))
                attributes = attributes.attributes;

            //attributes = util.extend({}, this.$model.$table.defaults, attributes);
            var defaults = this.$model.$table.defaults;
            for (var k in defaults) {
                if (attributes[k] === undefined) attributes[k] = defaults[k];
            }

            this.attributes = attributes;
            //this.set(attributes, {silent: true});
            this._changed = false;
            this._previousAttributes = null;
        },

        // Return a copy of the model's `attributes` object.
        toJSON: function(secure) {
            return util.clone(this.attributes);
        },

        // Get the value of an attribute.
        get: function(attr) {
            return this.attributes[attr];
        },

        // Returns `true` if the attribute contains a value that is not null
        // or undefined.
        has: function(attr) {
            return this.attributes[attr] != null;
        },

        // Set a hash of model attributes on the object, firing `"change"` unless you
        // choose to silence it.
        set: function() {
            if (arguments.length == 0) return this;

            var attrs = {}, options = null;

            // Extract attributes and options.
            if (typeof arguments[0] === 'object') {
                attrs = arguments[0];
                if (attrs.attributes) attrs = attrs.attributes;
                options = arguments.length > 1 ? arguments[1] : {};
            } else if (typeof arguments[0] === 'string' && arguments.length > 1) {
                attrs[arguments[0]] = arguments[1];
                options = arguments.length > 2 ? arguments[2] : {};
            }

            if (util.isEmpty(attrs)) return this;

            options || (options = {});
            var now = this.attributes;

            // Run validation.
            if (!options.silent && this.validate && !this._performValidation(attrs, options)) return false;

            // Check for changes of `id`.
            //if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

            // We're about to start triggering change events.
            var alreadyChanging = this._changing;
            this._changing = true;

            // Update attributes.
            for (var attr in attrs) {
                var val = attrs[attr];
                if (!util.isEqual(now[attr], val)) {
                    if (!options.silent) {
                        this._previousAttributes = this._previousAttributes || {};
                        this._previousAttributes[attr] = now[attr];
                    }
                    now[attr] = val;
                    this._changed = true;
                    if (!options.silent) this.emit('change:' + attr, this, val, options);
                }
            }

            // Fire the `"change"` event, if the model has been changed.
            if (!alreadyChanging && !options.silent && this._changed)
                this.emit('change', this, options);

            this._changing = false;
            return this;
        },

        clear: function(options) {
            this._previousAttributes = null;
            this._changed = false;
            return this;
        },

        // Create a new model with identical attributes to this one.
        clone: function() {
            return new this.constructor(this);
        },

        // Determine if the model has changed since the last `"change"` event.
        // If you specify an attribute name, determine if that attribute has changed.
        hasChanged: function(attr) {
            if (!this._previousAttributes) return false;
            if (attr) return this._previousAttributes[attr] != this.attributes[attr];
            return this._changed;
        },

        // Return an object containing all the attributes that have changed, or false
        // if there are no changed attributes. Useful for determining what parts of a
        // view need to be updated and/or what attributes need to be persisted to
        // the server.
        changedAttributes: function(now) {
            if (!this._previousAttributes) return false;
            now || (now = this.attributes);
            var old = this._previousAttributes;
            var changed = false;
            for (var attr in now) {
                if (Object.prototype.hasOwnProperty.call(old, attr) && !util.isEqual(old[attr], now[attr])) {
                    changed = changed || {};
                    changed[attr] = now[attr];
                }
            }
            return changed;
        },

        // Get the previous value of an attribute, recorded at the time the last
        // `"change"` event was fired.
        previous: function(attr) {
            if (!attr || !this._previousAttributes) return null;
            return this._previousAttributes[attr];
        },

        // Get all of the attributes of the model at the time of the previous
        // `"change"` event.
        previousAttributes: function() {
            if (!this._previousAttributes) return null;
            return util.clone(this._previousAttributes);
        },

        // Run validation against a set of incoming attributes, returning `true`
        // if all is well. If a specific `error` callback has been passed,
        // call that instead of firing the general `"error"` event.
        _performValidation: function(attrs, options) {
            var error = this.validate(attrs);
            if (error) {
                if (options.error) {
                    options.error(this, error, options);
                } else {
                    this.emit('error', this, error, options);
                }
                return false;
            }
            return true;
        },

        insert: function(callback) {
            this.$model.insert(this, callback);
        },

        update: function(callback) {
            this.$model.update(this, callback);
        },

        delete: function(callback) {
            this.$model.delete(this, callback);
        }
    };/*}}}*/

    /*{{{ Criteria */
    var Criteria = exports.Criteria = new Class({
        initialize: function(select, filter, orderBy, limit) {
            this._select = select;
            this._filter = filter;
            this._orderBy = orderBy;
            this._limit = limit;
        },

        clone: function() {
            return new Criteria(this._select, this._filter, this.orderBy, this._limit);
        },

        where: function(filter) {
            this._filter = filter;
            return this;
        },

        limit: function(offset, limit) {
            if (offset === null) {
                this._limit = null;
            } else {
                this._limit = new Criteria.Limit(offset, limit);
            }
            return this;
        },

        orderBy: function(column) {
            if (column === null) {
                this._orderBy = null;
            } else {
                this._orderBy = new Criteria.OrderBy(column);
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
                self._query(function(err, rows){
                    if (err) return callback(err);
                    self._select.convertRows(rows, opts, function(err, objects){
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

            logger.debug('Discover> SQL: %s | Args: %s', sql, args);

            db.query(sql, args, function(err, rows, fields){
                if (err) {
                    logger.error("Database error: " + err.message + ";\nSQL: " + err.sql);
                    return callback ? callback(err, rows) : null;
                }
                if (callback) callback(null, rows);
            });
            return this;
        }
    });

    var Q = exports.Q = Criteria;

    Criteria.Select = new Class({
        initialize: function(model) {
            this._model = model;
        },

        toSQL: function() {
            var table = this._model.$table;
            var cols = table.pks.map(function(f){ return '`' + f.column+ '`'; }).join(', ');
            return 'SELECT ' + cols + ' FROM `' + table.name + '`';
        },

        convertRows: function(rows, opts, callback) {
            var model = this._model;
            if (!rows || rows.length === 0) return callback(null, []);
            model.findByIds(rows, function(err, objects){
                if (err) return callback(err);

                var missed = [];
                for (var i = 0, l = rows.length; i < l; i++) {
                    if (objects[i] === null) {
                        missed.push(rows[i]);
                    }
                }
                if (missed.length) {
                    var keys = missed.map(function(id){return model._cacheKey(id);}, model);
                    // delete cache again try again
                    async.forEach(keys, function(key, done){
                        cache.del(key, function(){ done(); });
                    }, function(){
                        callback(AGAIN);
                    });
                    /*
                    Flow(keys)
                        .parEach(5, function(key){
                            cache.del(key, this);
                        })
                        .seq(function(){
                            callback(AGAIN);
                        });
                    */
                } else {
                    callback(err, objects);
                }
            }, opts);
        }
    });

    Criteria.Select.Id = new Class({
        Extends: Criteria.Select,

        convertRows: function(rows, opts, callback) {
            callback(null, rows);
        }
    });

    Criteria.Select.Count = new Class({
        Extends: Criteria.Select,

        toSQL: function() {
            return 'SELECT COUNT(*) AS `count` FROM `' + this._model.$table.name + '`';
        },

        convertRows: function(rows, opts, callback) {
            if (!rows || rows.length === 0) return callback(null, 0);
            callback(null, Number(rows[0].count));
        }
    });

    Criteria.Select.Max = new Class({
        Extends: Criteria.Select,

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
    });

    Criteria.Select.Sum = new Class({
        Extends: Criteria.Select,

        initialize: function(model, columns) {
            this._model = model;
            this._columns = columns;
        },

        toSQL: function() {
            var sql_sum = this._columns.map(function(column) {
                    return 'SUM(`' + column + '`) AS `' + column + '`';
                }).join(', ');
            return 'SELECT ' + sql_sum + ' FROM `' + this._model.$table.name + '`';
        },

        convertRows: function(rows, opts, callback) {
            if (!rows || rows.length === 0) return callback(null, null);

            callback(null, rows[0]);
        }
    });


    Criteria.Filter = new Class({
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
    });

    Criteria.Filter.Null = new Class({
        Extends: Criteria.Filter,

        toSQL: function() {
            return '`' + this.column + '` IS NULL';
        },

        getArgs: function() {
            return [];
        }
    });

    Criteria.Filter.NotNull = new Class({
        Extends: Criteria.Filter.Null,

        toSQL: function() {
            return '`' + this.column + '` IS NOT NULL';
        }
    });

    Criteria.Filter.AND = new Class({
        Extends: Criteria.Filter,

        $operator: 'AND',

        initialize: function() {
            this.filters = util.filter(util.flatten(util.toArray(arguments)), function(f){return f;});
        },

        toSQL: function() {
            var sql = this.filters.map(function(f){ return f.toSQL(); }).join(' ' + this.$operator + ' ');
            if (this.filters.length > 1) sql = '(' + sql + ')';
            return sql;
        },

        getArgs: function() {
            var args = this.filters.map(function(f){ return f.getArgs(); });
            return util.flatten(args);
        }
    });

    Criteria.Filter.OR = new Class({
        Extends: Criteria.Filter.AND,

        $operator: 'OR'
    });

    Criteria.Limit = new Class({
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
    });

    Criteria.OrderBy = new Class({
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
    });


    util.extend(Criteria, {
        select: function(model) {
            return new Criteria(new Criteria.Select(model));
        },

        id: function(model) {
            return new Criteria(new Criteria.Select.Id(model));
        },

        count: function(model) {
            return new Criteria(new Criteria.Select.Count(model));
        },

        max: function(model, column) {
            return new Criteria(new Criteria.Select.Max(model, column));
        },

        sum: function(model, columns) {
           return new Criteria(new Criteria.Select.Sum(model, columns));
        },

        and: function() {
            return new Criteria.Filter.AND(util.toArray(arguments));
        },

        or: function() {
            return new Criteria.Filter.OR(util.toArray(arguments));
        },

        eq: function(column, value) {
            return new Criteria.Filter(column, '=', value);
        },

        neq: function(column, value) {
            return new Criteria.Filter(column, '<>', value);
        },

        gt: function(column, value) {
            return new Criteria.Filter(column, '>', value);
        },

        gte: function(column, value) {
            return new Criteria.Filter(column, '>=', value);
        },

        lt: function(column, value) {
            return new Criteria.Filter(column, '<', value);
        },

        lte: function(column, value) {
            return new Criteria.Filter(column, '<=', value);
        },

        isNull: function(column) {
            return new Criteria.Filter.Null(column);
        },

        isNotNull: function(column) {
            return new Criteria.Filter.NotNull(column);
        }
    });
    /*}}}*/

    function getDatabase() {
        return db;
    }

    return {
        Criteria: Criteria,
        getPool: getDatabase,
        Model: Model
    };
}

module.exports = Discover;

/* vim: set fdm=marker */
