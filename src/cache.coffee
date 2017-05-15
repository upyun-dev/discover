Memcached = require "memcached"

class Cache
  constructor: (@cfg) ->
    @inst = @init_cache @cfg if @cfg?

  init_cache: ({ servers, options = {} }) -> new Memcached servers, options

  get: (key) ->
    new Promise (resolve, reject) =>
      if @inst? then @inst.get key, (err, data) ->
        if err? then reject err else resolve data
      else resolve []

  del: (key) ->
    new Promise (resolve, reject) =>
      if @inst? then @inst.del key, (err) ->
        if err? then reject err else resolve null
      else resolve null

  set: (key, value, expire) ->
    new Promise (resolve, reject) =>
      if @inst? then @inst.set key, value, expire, (err) ->
        if err? then reject err else resolve null
      else resolve null

module.exports = Cache