var mysql = require('mysql');

var ConnectionPool = require('generic-pool').Pool;

var pools = {};

exports.getPool = function(cfg) {//{{{
    if (!pools[cfg.database]) {
        pools[cfg.database] = new ConnectionPool({
            name: 'mysql-pool' + cfg.database,
            max: cfg.poolSize,
            idleTimeoutMillis: 60000,
            create: function(callback){
                var c = mysql.createConnection({
                    host: cfg.host || 'localhost',
                    user: cfg.user,
                    password: cfg.password,
                    database: cfg.database
                });
                c.connect();
                callback(null, c);
            },
            destroy: function(c){
                c.end();
            }
        });
    }

    return {
        query: function(sql, values, callback) {
            if ('function' === typeof values) {
                callback = values;
                values = [];
            }

            pools[cfg.database].acquire(function(err, db){
                if (err) return callback(err);

                db.query(sql, values, function(){
                    pools[cfg.database].release(db);
                    callback.apply(this, Array.prototype.slice.call(arguments));
                });
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
