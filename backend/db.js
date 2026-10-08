
require("dotenv").config();

const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "tasklink",
  password: "39028",
  port: 5433
});

module.exports = pool;