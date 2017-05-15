Database = require "../src/database"

cfg =
  host: "127.0.0.1"
  user: "root"
  password: ""
  database: "discover1"

database = new Database cfg

# database.query "SELECT * FROM test"
# .then (rows) -> console.log rows[0]
# .catch (err) -> console.error err

# database.next_sequence "name"
# .then (id) -> console.log id
# .catch (err) -> console.error err

module.exports = database