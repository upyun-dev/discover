DataBase = require "./database"
Cache = require "./cache"
Table = require "./table"
Query = require "./query"
Model = require "./model"
Schema = require "./schema"
Operator = require "./operator"
Type = require "./type"
init_schema = require "./mixed"

class Discover
  constructor: (db_cfg, cache_cfg) ->
    @database = new DataBase db_cfg
    @cache = new Cache cache_cfg
    @mixed = init_schema { @database, @cache }

  @Query = Query
  @Table = Table
  @Type = Type
  @Schema = Schema
  @Model = Model
  @Operator = Operator
  @DataBase = DataBase
  @Cache = Cache
  @Mix = init_schema

  create_schema: (params) -> @mixed params

module.exports = Discover
