const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Obtener las hojas de ruta para el usuario de la sucursal
exports.getUserRouteSheets = async (req, res) => {
    const userSucursal = req.session.user.sucursal;

    try {
        const result = await pool.query(`
            SELECT rs.*, rsd.sucursal 
            FROM route_sheets rs
            JOIN route_sheet_details rsd ON rs.id = rsd.route_sheet_id
            WHERE rsd.sucursal = $1
            GROUP BY rs.id, rsd.sucursal
            ORDER BY rs.created_at DESC
        `, [userSucursal]);

        const routeSheets = result.rows;
        res.render('user', { routeSheets, userSucursal });  // Pasar la sucursal a la vista
    } catch (err) {
        console.error(err);
        res.send('Error al obtener las hojas de ruta.');
    }
};

// Ver los detalles de una hoja de ruta
exports.viewRouteSheet = async (req, res) => {
    const routeSheetId = req.params.id;
    const user = req.session.user;

    try {
        let query, params;
        if (user.role === 'admin') {
            // Admin ve todas las líneas de la hoja de ruta
            query = 'SELECT * FROM route_sheet_details WHERE route_sheet_id = $1';
            params = [routeSheetId];
        } else {
            // Usuarios de sucursales solo ven las líneas de su sucursal
            query = 'SELECT * FROM route_sheet_details WHERE route_sheet_id = $1 AND sucursal = $2';
            params = [routeSheetId, user.sucursal];
        }

        const result = await pool.query(query, params);
        const routeSheetDetails = result.rows;
        res.render('view-route', { routeSheetId, routeSheetDetails });
    } catch (err) {
        console.error(err);
        res.send('Error al obtener los detalles de la hoja de ruta.');
    }
};

// Marcar hoja de ruta como recibida
exports.markAsReceived = async (req, res) => {
    const routeSheetId = req.params.id;
    const user = req.session.user;

    try {
        // Asegurarse de que el usuario solo pueda marcar como recibida las hojas de su sucursal y actualizar la fecha de recepción
        const result = await pool.query(`
            UPDATE route_sheets
            SET received = TRUE, fecha_recepcion = NOW()
            WHERE id = $1
            AND EXISTS (
                SELECT 1
                FROM route_sheet_details
                WHERE route_sheet_id = $1
                AND sucursal = $2
            )
        `, [routeSheetId, user.sucursal]);

        if (result.rowCount > 0) {
            res.redirect('/my-routes');
        } else {
            res.send('No tienes permiso para marcar esta hoja de ruta como recibida.');
        }
    } catch (err) {
        console.error(err);
        res.send('Error al actualizar el estado de la hoja de ruta.');
    }
};

// Cargar la página de carga de nuevas hojas de ruta
exports.loadRouteSheet = (req, res) => {
    res.render('load-route');
};
