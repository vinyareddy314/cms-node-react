require('dotenv').config();

module.exports = {
  client: 'pg',
  connection: {
    host: "dpg-d5oi348gjchc73a6oam0-a.singapore-postgres.render.com",
    port: Number(5432),
    user: "cms_db_9gdw_user",
    password: "MFbyWfwgSN2r4gm53VSi1PwCcI893Gb9",
    database: "cms_db_9gdw",
    ssl: { rejectUnauthorized: false }
  },
  migrations: {
    directory: './migrations'
  },
  seeds: {
    directory: './seeds'
  }
};


