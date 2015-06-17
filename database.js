var crypto = require('crypto');

var mysql = require('mysql');

var pools = {};

exports.getPool = function(cfg) {//{{{
    var key = crypto.createHash('md5').update(cfg.host + cfg.database).digest('hex');
    if (!pools[key]) {
      var pool  = mysql.createPool({
        connectionLimit : cfg.poolSize,
        host: cfg.host || 'localhost',
        user: cfg.user,
        password: cfg.password,
        database: cfg.database
      });

      pools[key] = pool;
    }

    return {
        query: function(sql, values, callback) {
            if ('function' === typeof values) {
                callback = values;
                values = [];
            }

            pools[key].query(sql, values, function(){
                callback.apply(this, Array.prototype.slice.call(arguments));
            });
        },

        next_sequence: function(name, callback) {
            this.query('INSERT INTO `sequence` (`name`) VALUES(?) ON DUPLICATE KEY UPDATE `id` = LAST_INSERT_ID(`id` + 1)', [name], function(err, info){
                if (err) return callback(err);
                callback(null, info.insertId);
            });
        }
    };
};//}}}
