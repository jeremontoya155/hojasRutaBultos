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
            req.session.user = user;  // Almacena la información del usuario en la sesión

            if (user.role === 'admin') {
                res.redirect('/admin');  // Admin redirigido a la vista de administración
            } else if (user.role === 'reparto') {
                res.redirect('/view-all-routes');  // Reparto redirigido a la vista de todas las rutas
            } else {
                res.redirect('/my-routes');  // Usuarios de sucursales redirigidos a la vista de sus rutas
            }
        } else {
            res.send('Usuario o contraseña incorrectos.');
        }
    } catch (err) {
        console.error(err);
        res.send('Error al conectar a la base de datos.');
    }
};

