const mysql = require('mysql2/promise');
require('dotenv').config()

//console.log(process.env.MUSQL_USER)
const connection = mysql.createPool({
    //user: 'root',
    user: 'admin', //process.env.MYSQL_USER,
    host: 'localhost', //process.env.MYSQL_HOST,
    password:'32565996', //process.env.MYSQL_PASSWORD,
    //database: process.env.MYSQL_DB
    database: "medidores_de_energia"
  });

module.exports = connection;
