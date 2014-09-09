var util = require('util'),
    Memcached = require('memcached');

module.exports.init = function(servers, options) {
    var memcached = new Memcached(servers, options);

    memcached.on('failure', function(details){
        util.log("Server " + details.server + " went down due to: " + details.messages.join(''));
    });
    memcached.on('reconnecting', function(details){
        util.debug("Total downtime caused by server " + details.server + " :" + details.totalDownTime + "ms");
    });

    return memcached;
};

/*
var mget = memcached.get;
memcached.get = function(key, callback){
    console.log('memcache.get("' + key + '")');
    return mget.call(this, key, callback);
};

var mset = memcached.set;
memcached.set = function(key, value, expires, callback){
    console.log('memcache.set("' + key + '"): ', value);
    return mset.call(this, key, value, expires, callback);
};

var mdel = memcached.del;
memcached.del = function(key, callback){
    console.log('memcache.del("' + key + '")');
    return mdel.call(this, key, callback);
};
*/
