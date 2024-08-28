const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

exports.loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            res.render('index', { user });
        } else {
            res.send('Usuario o contraseña incorrectos.');
        }
    } catch (err) {
        console.error(err);
        res.send('Error al conectar a la base de datos.');
    }
};
