cache = require "./cache"
database = require "./database"
Mixed = require "../src/mixed"

Schema = Mixed { database, cache }

User = Schema
  tablename: "user"

  fields: [
    { column: "id", type: "int", pk: yes, auto: yes }
    { column: "name", type: "string", default: "hero of the strom" }
    { name: "age", type: "int" }
    { column: "comments", type: "json" }
    { column: "remark", type: "double" }
    { column: "last_login", type: "datetime" }
  ]

  indices: [
    { column: "name", type: "string" }
  ]

  foo: -> null
  bar: -> null

user = new User name: "kafka", age: 10, comments: ["good", "bad", "foo", "bar"], remark: 0.98, last_login: new Date()

User.all()
.then (models) ->
  console.log models.length
  User.count()
.then (count) ->
  console.log count
  User.find age: { op: "gte", value: 5 }, { limit: 3, orderby: { column: "id", order: "desc" }, page: 2 }
.then (models) ->
  # console.log models
  User.findone age: { op: "gte", value: 5 }
.then (model) ->
  # console.log model
  User.find_with_count age: { op: "gte", value: 5 }
.then ({ models, total }) ->
  # console.log models, total
  User.find_by_index "id", 10
.then (models) ->
  # console.log models
  User.find_by_unique_key "id", 11
.then (model) ->
  # console.log model
  User.find_by_id id: 20
.then (model) ->
  # console.log model
  User.find_by_ids [2..4]
.then (models) ->
  # console.log models
  User.find_and_update { age: { op: "gte", value: 5 } }, { name: "flink", age: 6 }
.then ({ updates }) ->
  console.log "updates:", updates
  User.find_and_delete id: 2
.then ({ deletes }) ->
  console.log "deletes:", deletes
#   User.insert user
# .then (model) ->
#   console.log model
.catch (err) -> console.error err