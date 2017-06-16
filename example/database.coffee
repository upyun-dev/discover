Database = require "../src/database"

cfg =
  host: "127.0.0.1"
  user: "root"
  password: ""
  database: "test"

database = new Database cfg
console.log database
do ->
  [row] = await database.query "SELECT * FROM user"
  console.log row
  id = await database.next_sequence "name"
  console.log id
# database.query "SELECT * FROM test"
# .then (rows) -> console.log rows[0]
# .catch (err) -> console.error err

# database.next_sequence "name"
# .then (id) -> console.log id
# .catch (err) -> console.error err

module.exports = database
