var database = require('./database');
var Cache = require('./cache');
var Model = require('./model');
var Criteria = require('./criteria');

function discover(dbCfg, cacheCfg) {
  var db = database.getPool(dbCfg);
  var cache = Cache.init(cacheCfg);

  var getDatabase = function() {
    return db;
  };

  return {
    Criteria: Criteria.init({ db: db, cache: cache }),
    Model: Model.init({ db: db, cache: cache }),
    getPool: getDatabase
  };
}

module.exports = discover;

/* vim: set fdm=marker */
