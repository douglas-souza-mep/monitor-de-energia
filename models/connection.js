const mysql = require('mysql2/promise');
require('dotenv').config()


const connection = mysql.createPool({
    user: 'mep',
    host: 'localhost',
    password:'32565996',
    database: "medidores_de_energia"
  });
  
module.exports = connection;