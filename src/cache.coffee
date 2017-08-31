Memcached = require "memcached"
util = require "util"

class Cache
  constructor: (@cfg) ->
    @inst = @init_cache @cfg if @cfg?
    @inst["async_#{name}"] = util.promisify @inst[name] for name in ["get", "del", "set"]

  init_cache: ({ servers, options = {} }) -> new Memcached servers, options

  get: (key) -> await @inst?.async_get key ? {}

  del: (key) -> await @inst?.async_del key

  set: (key, value, expire) -> await @inst?.async_set key, value, expire

module.exports = Cache