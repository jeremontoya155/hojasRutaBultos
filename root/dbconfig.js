const { Pool } = require('pg');

// Pool para la base de datos principal
const railwayPool = new Pool({
    connectionString: process.env.RAILWAY_DATABASE_URL, // Configurado en .env
    ssl: { rejectUnauthorized: false }
});

// Pool para la base Plex
const plexPool = new Pool({
    host: 'serverndv.no-ip.org',
    port: 6613,
    user: 'comprasfsa',
    password: 'S1nch2z@c4mpr1sfs1',
    database: 'plexdr',
    ssl: false // Sin SSL para la base Plex
});

module.exports = { railwayPool, plexPool };
