const mysql = require('mysql2/promise');

const mysqlPool = mysql.createPool({
    host: 'serverndv.no-ip.org',
    port: 6613,
    user: 'comprasfsa',
    password: 'S1nch2z@c4mpr1sfs1',
    database: 'plexdr'
});

module.exports = mysqlPool;
