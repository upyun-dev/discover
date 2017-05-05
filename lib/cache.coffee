Memcached = require "memcached"

class Cache
  constructor: (@cfg) ->
    @inst = @init_cache @cfg if @cfg?

  init_cache: ({ servers, options = {} }) ->
    new Memcached servers, options
    .on "failure", (details) -> console.error details
    .on "reconnectiong", (details) -> console.info details

  get: (key, callback) ->
    return callback null, [] unless @inst?
    @inst.get key, callback

  del: (key, callback) ->
    return callback null, null unless @inst?
    @inst.del key, callback

  set: (key, value, expire, callback) ->
    return callback null, null unless @inst?
    @inst.set key, value, expire, callback

module.exports = Cache