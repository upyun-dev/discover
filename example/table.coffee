Table = require "../src/table"
Type = require "../src/type"

boxed = (field) -> new (Type[field.type] ? Type.raw) field
fields = [
  { column: "id", type: "int", pk: yes, auto: yes }
  { column: "name", type: "raw", default: "hero of the strom" }
  { name: "col", type: "string" }
  { column: "json_field", type: "json" }
  { column: "float_field", type: "double" }
  { column: "time_field", type: "date" }
]

boxed_fields = for field in fields then boxed field
table = new Table name: "test", fields: boxed_fields
# console.log table
module.exports = table