mysql = require "mysql"
generic_pool = require "generic-pool"

# News:
# query, next_sequence => 现在返回 Promise

class DataBase
  pools: {}

  constructor: (@cfg = {}) ->
    @cfg.host ?= "localhost"
    @pools[@cfg.database] ?= generic_pool.createPool { @create, @destroy },
      max: @cfg.poolsize
      idleTimeoutMillis: 60000

  create: ->
    conn = mysql.createConnection @cfg
    conn.connect()
    Promise.resolve conn

  destroy: (conn) ->
    conn.end()
    Promise.resolve null

  _query: (pool, db, sql, values, callback) ->
    new Promise (resolve, reject) ->
      db.query sql, values, ([err, args...]...) ->
        pool.release db
        callback? err, args...
        err and throw err
        resolve args...

  # pub APIs
  query: (sql, values = [], callback) ->
    if typeof values is "function"
      callback = values
      values = []

    pool = @pools[@cfg.database]
    pool.acquire()
    .then (db) => @_query pool, db, sql, values, callback

  next_sequence: (name, callback) ->
    sql = """
      INSERT INTO `sequence` (`#{name}`) VALUES(?) ON DUPLICATE KEY UPDATE `id` = LAST_INSERT_ID(`id` + 1)
    """

    @query sql, [name], (err, { insertId } = {}) -> callback? err, insertId
    .then ({ insertId }) -> insertId

module.exports = DataBase
