cache = require "./cache"
database = require "./database"
Mixed = require "../src/mixed"

Schema = Mixed { database, cache }

User = Schema
  tablename: "user"

  fields: [
    { column: "id", type: "int", pk: yes, auto: yes }
    { column: "name", type: "raw", default: "hero of the strom" }
    { name: "col", type: "string" }
    { column: "json_field", type: "json" }
    { column: "float_field", type: "double" }
    { column: "time_field", type: "date" }
  ]

  indices: [
    { column: "asd", type: "int", unique: yes }
  ]

  foo: -> null
  bar: -> null

user = new User id: 1, name: "kafka", col: "fire in the hole", json_field: "{}", float_field: 0.9, time_field: new Date()

console.log user.$schema.$table