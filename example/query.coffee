table = require "./table"
cache = require "./cache"
database = require "./database"
Query = require "../src/query"

class Schema
  constructor: -> @$schema = @constructor
  get: (k) -> "#{(new Date()).toISOString()}"
  @$cache: cache
  @$database: database
  @$table: table

console.log (new Query Schema).select().where({ id: 1, col: { op: "like", value: "sss" } }).to_sql()
console.log (new Query Schema).select().where({}).to_sql()
console.log (new Query Schema).select().where({ id: 1, col: { op: "like", value: "sss" } }).orderby("id").limit(5, 10).to_sql()
console.log (new Query Schema).select().where({ id: 1, col: { op: "like", value: "sss" } }).orderby({ column: "id", order: 'desc'}).limit(10).to_sql()
console.log (new Query Schema).id().where({ id: 1, col: { op: "like", value: "sss" } }).orderby({ column: "id", order: 'desc'}).limit(10).to_sql()
console.log (new Query Schema).count().where({ id: 1, col: { op: "like", value: "sss" } }).orderby({ column: "id", order: 'desc'}).limit(10).to_sql()
console.log (new Query Schema).max("id").where({ id: 1, col: { op: "like", value: "sss" } }).orderby({ column: "id", order: 'desc'}).limit(10).to_sql()
console.log (new Query Schema).sum(["id", "name"]).where({ id: 1, col: { op: "like", value: "sss" } }).orderby({ column: "id", order: 'desc'}).limit(10).to_sql()
console.log (new Query Schema).update().set({ name: 2, col: "sdsd", json_field: "fdsfs" }).where({ id: 1, col: { op: "like", value: "sss" } }).to_sql()
console.log (new Query Schema).delete().where({ id: 1, col: { op: "like", value: "sss" } }).to_sql()
console.log (new Query Schema).insert().values(new Schema).to_sql()