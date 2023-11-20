const mysql = require('mysql2/promise');
require('dotenv').config()

//console.log(process.env.MUSQL_USER)
const connection = mysql.createPool({
    //user: 'root',
    user: process.env.MYSQL_USER,
    host: process.env.MYSQL_HOST,
    password: process.env.MYSQL_PASSWORD,
    //database: process.env.MYSQL_DB
    database: "medidores_de_energia"
  });

module.exports = connection;