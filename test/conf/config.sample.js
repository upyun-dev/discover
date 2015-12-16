module.exports = {
  cache: {
    servers: '127.0.0.1:11211',
    options: {}
  },
  database: {
    poolSize: 5,
    host: '127.0.0.1',
    user: 'root',
    password: 'password',
    database: 'discover1'
  },
  // for bad configurations test
  dupDatabase: {
    poolSize: 0,
    user: 'root',
    password: 'password',
    database: 'discover2'
  }
};
