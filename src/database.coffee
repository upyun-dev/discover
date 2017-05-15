mysql = require "mysql"

class DataBase
  pools: {}

  default_cfg:
    connectionLimit: 10
    supportBigNumbers: yes
    host: "localhost"

  constructor: (@cfg = {}) ->
    @cfg = Object.assign @default_cfg, @cfg
    @pools[@cfg.database] ?= mysql.createPool @cfg

  create: ->
    conn = mysql.createConnection @cfg
    conn.connect()
    Promise.resolve conn

  destroy: (conn) ->
    conn.end()
    Promise.resolve null

  # pub APIs
  query: (sql, values = []) ->
    pool = @pools[@cfg.database]

    new Promise (resolve, reject) =>
      pool.getConnection (err, conn) =>
        err and throw err
        conn.query sql, values, (err, args...) ->
          conn.release()
          err and throw err
          resolve args...

  next_sequence: (name) ->
    sql = """
      INSERT INTO `sequence` (`#{name}`) VALUES(?) ON DUPLICATE KEY UPDATE `id` = LAST_INSERT_ID(`id` + 1)
    """

    @query sql, [name]
    .then ({ insertId }) -> insertId

module.exports = DataBase
