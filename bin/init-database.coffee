#!/usr/bin/env coffee

mysql = require "mysql"
{ database, dup_database } = requrie "../test/conf/config"

{ host, user, password } = database
conn = mysql.createConnection { host, user, password, multipleStatements: on }

sql = "
  CREATE DATABASE #{database.database};
  CREATE DATABASE #{dup_database.database};
"

conn.connect (err) ->
  return console.error err if err?
  conn.query sql, (err, result) ->
    if err?
      console.error err
    else
      console.info result
    process.exit 0