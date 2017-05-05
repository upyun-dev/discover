DataBase = require "./database"
Cache = require "./cache"
init_table = require "./table"
init_schema = require "./schema"
init_criteria = require "./cirteria"

# Breaking changes:
# getPool => get_database
# Model => create_model
# Criteria => get_criteria
class Discover
  constructor: (db_cfg, cache_cfg) ->
    @database = new DataBase db_cfg
    @cache = new Cache cache_cfg

    @Schema = init_schema { @database, @cache }
    @Criteria = init_criteria { @database, @cache }
    @Table = init_table { @database, @cache }

  get_database: -> @database
  create_model: (params) -> @Schema params
  get_criteria: -> @Criteria

module.exports = Discover
