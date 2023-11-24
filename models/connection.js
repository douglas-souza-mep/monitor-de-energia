const mysql = require('mysql2/promise');
require('dotenv').config()

//console.log(process.env.MUSQL_USER)
const connection = mysql.createPool({
    user: process.env.MYSQL_USER || 'root',
    host: process.env.MYSQL_HOST || 'localhost',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DB || "medidores_de_energia"
  });

module.exports = connection;