var database = require('./database');
var cachelib = require('./cache');
var Model = require('./model');
var Criteria = require('./criteria');

function Discover(dbCfg, cacheCfg) {
  cacheCfg = cacheCfg || {};

  var db = database.getPool(dbCfg);
  var cache = cachelib.init(cacheCfg);

  var getDatabase = function () {
    return db;
  }

  return {
    Criteria: Criteria,
    Model: Model,
    getPool: getDatabase
  };
}

module.exports = discover;

/* vim: set fdm=marker */
