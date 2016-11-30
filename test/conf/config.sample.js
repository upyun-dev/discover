module.exports = {
  cache: {
    servers: 'memcached:11211',
    options: {}
  },
  database: {
    poolSize: 5,
    host: 'mysql',
    user: 'root',
    password: '',
    database: 'discover1'
  },
  // for bad configurations test
  dupDatabase: {
    host: 'mysql',
    poolSize: 0,
    user: 'root',
    password: '',
    database: 'discover2'
  }
};
