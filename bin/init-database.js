#!/usr/bin/env node

const mysql = require('mysql');
const { database, dupDatabase } = require('../test/conf/config');

let conn = mysql.createConnection({ host: database.host, user: database.user, password: database.password, multipleStatements: true });
let q = `create database ${database.database}; create database ${dupDatabase.database};`;

conn.connect((err) => {
  if (err) return console.error(err.message);

  conn.query(q, (err, result) => {
    if (err)
      console.error(err.message);
    else
      console.info(result);
    process.exit(0);
  });
});
