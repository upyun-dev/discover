var moment = require('moment');
var util = require('./util');
var Class = util.Class;

// Field Type definenation

var raw = new Class({
  initialize: function(attrs) {
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

var json = new Class({
  Extends: raw,

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
    } catch (e) {
      return null;
    }
  },

  defaultValue: function() {
    return {};
  }
});

var int = new Class({
  Extends: raw,

  defaultValue: function() {
    return 0;
  }
});

var date = new Class({
  Extends: raw,

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

exports.raw = raw;
exports.json = json;
exports.int = int;
exports.date = exports.datetime = exports.timestamp = date;
