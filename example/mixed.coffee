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
  console.log models[19].id
  User.count()
.then (count) ->
  console.log count
.catch (err) -> console.error err