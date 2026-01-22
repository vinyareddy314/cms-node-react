import knex, { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const config: Knex.Config = {
  client: 'pg',
  connection: {
    host: "dpg-d5oi348gjchc73a6oam0-a.singapore-postgres.render.com",
    port: 5432,
    user: "cms_db_9gdw_user",
    password: "MFbyWfwgSN2r4gm53VSi1PwCcI893Gb9",
    database: "cms_db_9gdw",
    ssl: { rejectUnauthorized: false }
  },
  pool: {
    min: 2,
    max: 10
  }
};

export const db = knex(config);

export async function checkDbConnection() {
  await db.raw('select 1+1 as result');
}


