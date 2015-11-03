var util = require('util');
var Memcached = require('memcached');

// var cache = null;

function cacheInit(cfg) {
  if (cfg) {
    cache =
      new Memcached(cfg.servers, cfg.options)
      .on('failure', function (details) {
        util.log(`Server ${details.server} went down due to:  ${details.messages.join('')}`);
      })
      .on('reconnecting', function (details) {
        util.debug(`Total downtime caused by server ${details.server}:  ${details.totalDownTime} ms`);
      });
  } else {
    cache = {
      get: function (key, callback) {
        callback(null, []);
      },
      del: function (key, callback) {
        callback(null, null);
      },
      set: function (key, val, expire, callback) {
        callback(null, null);
      }
    };
  }

  return cache;
};

// module.exports.cache = cache;
module.exports.init = cacheInit;


/*
var mget = memcached.get;
memcached.get = function(key, callback) {
    console.log('memcache.get("' + key + '")');
    return mget.call(this, key, callback);
};

var mset = memcached.set;
memcached.set = function(key, value, expires, callback) {
    console.log('memcache.set("' + key + '"): ', value);
    return mset.call(this, key, value, expires, callback);
};

var mdel = memcached.del;
memcached.del = function(key, callback) {
    console.log('memcache.del("' + key + '")');
    return mdel.call(this, key, callback);
};
*/
