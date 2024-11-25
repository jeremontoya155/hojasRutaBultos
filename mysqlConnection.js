require('dotenv').config(); // Cargar las variables de entorno desde el archivo .env

const mysql = require('mysql2/promise');

const mysqlPool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
});

module.exports = mysqlPool;