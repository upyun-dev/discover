mysql = require "mysql"
util = require "util"

class DataBase
  pools: {}

  default_cfg:
    connectionLimit: 10
    supportBigNumbers: yes
    host: "localhost"

  constructor: (@cfg = {}) ->
    @cfg = Object.assign @default_cfg, @cfg
    @pools[@cfg.database] ?= mysql.createPool @cfg
    @promisify @pools[@cfg.database]

  promisify: (pool) ->
    pool["async_#{name}"] ?= util.promisify pool[name] for name in ["getConnection"]

  create: ->
    conn = mysql.createConnection @cfg
    await conn.connect()

  destroy: (conn) ->
    await conn.end()

  # pub APIs
  query: (sql, values = []) ->
    pool = @pools[@cfg.database]
    conn = await pool.async_getConnection()
    conn.async_query ?= util.promisify conn.query
    result = await conn.async_query sql, values
    conn.release()
    result

  stream: (sql, values = []) ->
    pool = @pools[@cfg.database]
    conn = await pool.async_getConnection()
    query_stream = conn.query sql, values
    [conn, query_stream]

  next_sequence: (name) ->
    sql = """
      INSERT INTO `sequence` (`#{name}`) VALUES(?) ON DUPLICATE KEY UPDATE `id` = LAST_INSERT_ID(`id` + 1)
    """

    { insertId } = await @query sql, [name]
    insertId

module.exports = DataBase
