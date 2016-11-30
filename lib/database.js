var mysql = require('mysql');
var genericPool = require('generic-pool');

var pools = {};

exports.getPool = function(cfg) {
  let factory = {
    create: function() {
      let c = mysql.createConnection({
        host: cfg.host || 'localhost',
        user: cfg.user,
        password: cfg.password,
        database: cfg.database
      });
      c.connect();

      return new Promise(function(resolve, reject) {
        resolve(c);
      });
    },
    destroy: function(c) {
      return new Promise(function(resolve, reject) {
        c.end();
        resolve();
      });
    }
  };

  let config = {
    max: cfg.poolSize,
    idleTimeoutMillis: 60000
  };

  if (!pools[cfg.database])
    pools[cfg.database] = genericPool.createPool(factory, config);

  return {
    query: function(sql, values, callback) {
      let pool = pools[cfg.database];

      if ('function' === typeof values) {
        callback = values;
        values = [];
      }

      pool.acquire()
        .then(function(db) {
          db.query(sql, values, function() {
            pool.release(db);
            callback.apply(this, Array.prototype.slice.call(arguments));
          });
        })
        .catch(function(err) { callback(err); });
    },

    next_sequence: function(name, callback) {
      this.query('INSERT INTO `sequence` (`name`) VALUES(?) ON DUPLICATE KEY UPDATE `id` = LAST_INSERT_ID(`id` + 1)', [name], function(err, info) {
        if (err) return callback(err);
        callback(null, info.insertId);
      });
    }
  };
};

/* istanbul ignore else */
if (process.env.NODE_ENV === 'test') {
  exports.pools = pools;
}
