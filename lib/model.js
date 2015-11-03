var EventEmitter = require('events').EventEmitter;
var fieldTypes = require('./type');
var Table = require('./table');
var util = require('./util');
var common = require('./common');

var instanceMethods = common.instanceMethods;
var classMethods = common.classMethods;
var tables = {};

var createField = function (define) {
  var FieldType = fieldTypes[define.type] || Field;
  return new FieldType(define);
};

function Model(params, options) {
  var db = options.db;
  var cache = options.cache;

  params.fields = params.fields || [];

  var fields = [];
  var indices = params.indices || [];

  for (var i = 0, l = params.fields.length; i < l; i++) {
    var f = params.fields[i];
    fields.push(createField(f));
    if (f.index || f.unique) indices.push(f);
  }

  var tableName = params.tableName;
  var table = tables[tableName] = new Table(tableName, fields, db);

  delete params.fields;
  delete params.indices;
  delete params.tableName;

  var newModel = function() {
    this.$model = newModel;
    this.$initialize.apply(this, arguments);
    var value = (this.initialize) ? this.initialize.apply(this, arguments) : this;
    EventEmitter.call(this);
    return value;
  };
  newModel.$table = table;
  newModel.$constructor = Model;

  util.inherits(newModel, EventEmitter);
  util.extend(newModel, classMethods);

  util.each(indices, function(f) {
    var fieldName = f.name;
    var funcName = 'findBy' + fieldName.replace(/\b[a-z]/g, function(match) {
      return match.toUpperCase();
    }).replace(/_\D/g, function(match) {
      return match.charAt(1).toUpperCase();
    });
    if (newModel[funcName]) return;
    newModel[funcName] = function() {
      var args = util.toArray(arguments);
      args.unshift(fieldName);
      return this[f.unique ? 'findByUniqueKey' : 'findByIndex'].apply(this, args);
    };
  });

  var proto = newModel.prototype;
  proto.$constructor = newModel;

  util.extend(proto, instanceMethods);
  util.extend(proto, params);

  util.each(fields, function(f) {
    var fieldName = f.name;
    proto.__defineGetter__(fieldName, function() {
      return this.get(fieldName);
    });
    proto.__defineSetter__(fieldName, function(value) {
      return this.set(fieldName, value);
    });
  });

  return newModel;
};

module.exports = Model;