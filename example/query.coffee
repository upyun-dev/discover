table = require "./table"
cache = require "./cache"
database = require "./database"
Query = require "../src/query"

class Schema
  constructor: -> @$schema = @constructor
  get: (k) -> @attributes[k]
  attributes:
    name: "elasticsearch"
    age: 5
    comments: ["spider man", "superman", "batman", "the flash"]
    remark: 0.32
    last_login: new Date()
  @$cache: cache
  @$database: database
  @$table: table

(new Query Schema).select().where({ name: { op: "like", value: "kafka" } }).limit(2, 1).order_by({ column: "id", order: 'desc'}).execute()
.then (rets) -> console.log rets
.catch (err) -> console.error err
# console.log (new Query Schema).select().where({}).to_sql()
# console.log (new Query Schema).select().where({ id: 1, col: { op: "like", value: "sss" } }).order_by("id").limit(5, 10).to_sql()
# console.log (new Query Schema).select().where({ id: 1, col: { op: "like", value: "sss" } }).order_by({ column: "id", order: 'desc'}).limit(10).to_sql()
# console.log (new Query Schema).id().where({ id: 1, col: { op: "like", value: "sss" } }).order_by({ column: "id", order: 'desc'}).limit(10).to_sql()
# console.log (new Query Schema).count().where({ id: 1, col: { op: "like", value: "sss" } }).order_by({ column: "id", order: 'desc'}).limit(10).to_sql()
# console.log (new Query Schema).max("id").where({ id: 1, col: { op: "like", value: "sss" } }).order_by({ column: "id", order: 'desc'}).limit(10).to_sql()
# console.log (new Query Schema).sum(["id", "name"]).where({ id: 1, col: { op: "like", value: "sss" } }).order_by({ column: "id", order: 'desc'}).limit(10).to_sql()

# model = new Schema
# (new Query Schema).insert().values(model).execute()
# .then ({ id }) ->
#   model.attributes.id = id
#   model.attributes.name = "def"
#   model.attributes.age = 3
#   (new Query Schema).update().set(model).to_sql()
# .then (ret) -> console.log ret
# .catch (err) -> console.error err

# (new Query Schema).update().set({ name: "ooq" }).where({ name: { op: "like", value: "elasticsearch" } }).execute()
# .then ({ updates }) -> console.log changes
# .catch (err) -> console.error err
# (new Query Schema).delete().where({ id: 1 }).execute()
# .then ({ deletes }) -> console.log deletes
# .catch (err) -> console.error err