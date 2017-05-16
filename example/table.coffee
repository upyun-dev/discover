# create tables user (id int auto_increment, name text, age int, comments json, remark double, last_login timestamp, primary key (id));

Table = require "../src/table"
Type = require "../src/type"

boxed = (field) -> new (Type[field.type] ? Type.raw) field
fields = [
  { column: "id", type: "int", pk: yes, auto: yes }
  { column: "name", type: "string", default: "hero of the strom" }
  { name: "age", type: "int" }
  { column: "comments", type: "json" }
  { column: "remark", type: "double" }
  { column: "last_login", type: "datetime" }
]

boxed_fields = for field in fields then boxed field
table = new Table name: "user", fields: boxed_fields
# console.log table
module.exports = table