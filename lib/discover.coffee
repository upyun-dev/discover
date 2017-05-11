DataBase = require "./database"
Cache = require "./cache"
Table = require "./table"
Query = require "./query"
init_schema = require "./mixed"

class Discover
  constructor: (db_cfg, cache_cfg) ->
    @database = new DataBase db_cfg
    @cache = new Cache cache_cfg

    @Mixed = init_schema { @database, @cache }
    @Query = Query
    @Table = Table

  create_schema: (params) -> @Mixed params

module.exports = Discover
