module.exports = {

  development: {
    client: 'pg',
    connection: 'postgres://localhost/sk'
  },

  production: {
    client: 'pg',
    connection: process.env.DB_CONNECTION_STRING_PRODUCTION
  }

};
