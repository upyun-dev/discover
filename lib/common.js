var crypto = require('crypto');
var async = require('async');
var Q = require('./criteria');
var logger = require('./log');
var util = require('./util');
var isEntity = util.isEntity;

var cache = null;

// the common method for class/instance operations

exports.classMethods = {
  all: function(callback, opts) {
    Q.select(this).execute(opts, callback);
  },

  findByIndex: function(index, val, callback, opts) {
    Q.select(this).where(Q.eq(index, val)).execute(opts, callback);
  },

  findByUniqueKey: function(key, val, callback, opts) {
    this.findByIndex(key, val, function(err, entities) {
      if (err) return callback(err, entities);
      var result = (entities && entities.length > 0) ? entities[0] : null;
      callback(null, result);
    }, opts);
  },

  findById: function(id, callback, opts) {
    this.findByIds([id], function(err, objs) {
      if (err) return callback(err);
      if (objs.length) callback(null, objs[0]);
      else callback(null, null);
    }, opts);
  },

  findByIds: function(ids, callback, opts) {
    if (!Array.isArray(ids)) {
      throw new Error('First argument to findByIds must be an array of ids');
    }
    if (ids.length === 0) return callback(null, []);

    var self = this;
    var keys = ids.map(function(id) {return self._cacheKey(id);});

    function wraps(rows) {
      var objs = keys.map(function(key) {
        var obj = self._newInstance(rows[key]);
        if (obj && opts && opts.json) obj = obj.toJSON(opts.secure);
        return obj;
      });
      callback(null, objs);
    }

    cache.get(keys, function(err, rows) {
      if (err) logger.error('Memcached error: %s', String(err));
      var missed = null;
      for (var i = 0, l = keys.length; i < l; i++) {
        if (rows[keys[i]] === undefined) {
          if (!missed) missed = [];
          missed.push([[keys[i]], ids[i]]);
        }
      }
      if (missed && missed.length) {
        async.forEachLimit(missed, 10, function(kid, done) {
          self._loadFromDB(kid[1], function(err, row) {
            if (err) return done(err);
            rows[kid[0]] = row;
            done();
          });
        }, function(err) {
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

    this.$table.findById(id, function(err, row) {
      if (err) return callback(err, row);
      if (row) {
        cache.set(key, row, 0, function(err, done) {
          callback(null, row);
        });
      } else {
        // cache.set(key, null, 0, function(err, done) {
        callback(null, null);
        // });
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
    model._beforeHooks['insert'] = model._beforeHooks['insert'] || [];
    model._afterHooks['insert'] = model._afterHooks['insert'] || [];

    // perform an opts before insert
    var beforeTasks = model._beforeHooks['insert'].concat(model._walk('validate'));

    async.waterfall(beforeTasks, function(err) {
      if (err) {
        model.emit('error', new Error('invalid'));
      } else {
        self.$table.insert(model, function(err, result) {
          if (err) return callback ? callback(err, result) : null;
          cache.del(self._cacheKey(result), function(err, done) {
            var afterTasks = model._afterHooks['insert'];
            // perform an opts after insert
            async.series(afterTasks, function () {
              if (callback) callback(null, result);
            });
          });
        });
      }
    });

    return this;
  },

  update: function(model, callback) {
    if (!isEntity(model)) {
      if (callback) callback(new Error('Can not update non-model object'));
      return this;
    }
    var self = this;
    model._beforeHooks['update'] = model._beforeHooks['update'] || [];
    model._afterHooks['update'] = model._afterHooks['update'] || [];

    // perform an opts before update
    var beforeTasks = model._beforeHooks['update'].concat(model._walk('validate'));

    async.waterfall(beforeTasks, function(err) {
      if (err) {
        model.emit('error', new Error('invalid'));
      } else {
        self.$table.update(model, function(err, updated) {
          if (err) return callback ? callback(err, updated) : null;
          if (updated) {
            cache.del(self._cacheKey(model), function(err, done) {
              var afterTasks = model._afterHooks['update'];
              // perform an opts after update
              async.series(afterTasks, function () {
                if (callback) callback(null, model);
              });
            });
          } else {
            var afterTasks = model._afterHooks['update'];
            // perform an opts after update
            async.series(afterTasks, function () {
              if (callback) callback(null, model);
            });
          }
        });
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

    this.$table.delete(model, function(err, deleted) {
      if (err) return callback ? callback(err, deleted) : null;
      if (deleted) {
        cache.del(self._cacheKey(model), function(err, done) {
          if (callback) callback(null, model);
        });
      } else {
        if (callback) callback(null, model);
      }
    });
    return this;
  },

  // hooks defination
  before: function(model, methodName, exec) {
    model._beforeHooks[methodName] = model._beforeHooks[methodName] || [];

    if (model._isValidMethod(methodName)) {
      model._beforeHooks[methodName].push(function(callback) {
        exec(model, callback);
      });
    }
  },

  after: function(model, methodName, exec) {
    model._afterHooks[methodName] = model._afterHooks[methodName] || [];

    if (model._isValidMethod(methodName)) {
      model._afterHooks[methodName].push(function(callback) {
        exec(model, callback);
      });
    }
  },

  _cacheKey: function(val) {
    var id = '';
    if (isEntity(val)) {
      id = this.$table.pks.map(function(f) {
        if (f.type !== 'binary') {
          return String(val.get(f.name || f.column));
        }

        return val.get(f.name || f.column).toString('hex');
      }).join('-');
    } else if (Array.isArray(val)) {
      id = val.map(function(v) {
        if (Buffer.isBuffer(v)) return v.toString('hex');

        return String(v);
      }).join('-');
    } else if (util.isObject(val)) {
      id = this.$table.pks.map(function(f) {
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
};

exports.instanceMethods = {
  $initialize: function(attributes, options) {
    attributes = attributes || {};

    if (isEntity(attributes))
      attributes = attributes.attributes;

    // attributes = util.extend({}, this.$model.$table.defaults, attributes);
    var defaults = this.$model.$table.defaults;
    for (var k in defaults) {
      if (attributes[k] === undefined) attributes[k] = defaults[k];
    }

    this.attributes = attributes;
    // this.set(attributes, {silent: true});
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
    return this.attributes[attr] !== null;
  },

  // Set a hash of model attributes on the object, firing `'change'` unless you
  // choose to silence it.
  set: function() {
    if (arguments.length === 0) return this;

    var attrs = {};
    var options = null;

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

    options = options || {};
    var now = this.attributes;

    // Run validation.
    if (!options.silent && this.validate && !this._performValidation(attrs, options)) return false;

    // Check for changes of `id`.
    // if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

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

    // Fire the `'change'` event, if the model has been changed.
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

  // Determine if the model has changed since the last `'change'` event.
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
    now = now || this.attributes;
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
  // `'change'` event was fired.
  previous: function(attr) {
    if (!attr || !this._previousAttributes) return null;
    return this._previousAttributes[attr];
  },

  // Get all of the attributes of the model at the time of the previous
  // `'change'` event.
  previousAttributes: function() {
    if (!this._previousAttributes) return null;
    return util.clone(this._previousAttributes);
  },

  // Run validation against a set of incoming attributes, returning `true`
  // if all is well. If a specific `error` callback has been passed,
  // call that instead of firing the general `'error'` event.
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

  // exec-serise
  _walk: function(prefix) {
    var self = this;
    var pattern = new RegExp(`^${prefix}`);

    var ret = Object
      .keys(self)
      .filter(function(name) {
        return name.match(pattern);
      })
      .map(function(validateMethod) {
        return function (callback) {
          self[validateMethod](self.attributes, function(err) {
            callback(err);
          });
        };
      });

    return ret;
  },

  _isValidMethod: function(method) {
    return !!~['insert', 'update', 'delete'].indexOf(method);
  },

  // hooks
  before: function(methodName, exec) {
    this.$model.before(this, methodName, exec);
  },

  after: function(methodName, exec) {
    this.$model.after(this, methodName, exec);
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
};

exports.init = function(options) {
  cache = options.cache;
};
