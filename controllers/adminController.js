const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

exports.getRouteSheets = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM route_sheets ORDER BY created_at DESC');
        const routeSheets = result.rows;
        res.render('admin', { routeSheets });
    } catch (err) {
        console.error(err);
        res.send('Error al obtener las hojas de ruta.');
    }
};

exports.createRouteSheet = async (req, res) => {
    const { sucursal, cantidad_bultos, refrigerados, cantidad_refrigerados } = req.body;

    try {
        const result = await pool.query('INSERT INTO route_sheets (status) VALUES ($1) RETURNING id', ['pending']);
        const routeSheetId = result.rows[0].id;

        for (let i = 0; i < sucursal.length; i++) {
            await pool.query('INSERT INTO route_sheet_details (route_sheet_id, sucursal, cantidad_bultos, refrigerados, cantidad_refrigerados) VALUES ($1, $2, $3, $4, $5)', [
                routeSheetId,
                sucursal[i],
                cantidad_bultos[i],
                refrigerados[i] === 'true',
                refrigerados[i] === 'true' ? cantidad_refrigerados[i] : null
            ]);
        }

        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.send('Error al crear la hoja de ruta.');
    }
};


exports.receiveRouteSheet = async (req, res) => {
    const routeSheetId = req.params.id;

    try {
        await pool.query('UPDATE route_sheets SET received = TRUE WHERE id = $2', [routeSheetId]);
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.send('Error al marcar como recibida la hoja de ruta.');
    }
};

exports.editRouteSheet = async (req, res) => {
    const routeSheetId = req.params.id;
    try {
        const result = await pool.query('SELECT * FROM route_sheet_details WHERE route_sheet_id = $1', [routeSheetId]);
        const routeSheetDetails = result.rows;
        res.render('edit-route', { routeSheetId, routeSheetDetails });
    } catch (err) {
        console.error(err);
        res.send('Error al editar la hoja de ruta.');
    }
};

exports.updateRouteSheet = async (req, res) => {
    const routeSheetId = req.params.id;
    const { sucursal, cantidad_bultos, refrigerados, cantidad_refrigerados } = req.body;

    try {
        await pool.query('DELETE FROM route_sheet_details WHERE route_sheet_id = $1', [routeSheetId]);

        for (let i = 0; i < sucursal.length; i++) {
            await pool.query('INSERT INTO route_sheet_details (route_sheet_id, sucursal, cantidad_bultos, refrigerados, cantidad_refrigerados) VALUES ($1, $2, $3, $4, $5)', [
                routeSheetId,
                sucursal[i],
                cantidad_bultos[i],
                refrigerados[i] === 'true',
                refrigerados[i] === 'true' ? cantidad_refrigerados[i] : null
            ]);
        }

        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.send('Error al actualizar la hoja de ruta.');
    }
};

exports.sendRouteSheet = async (req, res) => {
    const routeSheetId = req.params.id;

    try {
        await pool.query('UPDATE route_sheets SET status = $1 WHERE id = $2', ['sent', routeSheetId]);
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.send('Error al enviar la hoja de ruta.');
    }
};



exports.loadRouteSheet = (req, res) => {
    res.render('load-route');
};


exports.viewRouteSheet = async (req, res) => {
    const routeSheetId = req.params.id;
    try {
        const result = await pool.query('SELECT * FROM route_sheet_details WHERE route_sheet_id = $1', [routeSheetId]);
        const routeSheetDetails = result.rows;
        res.render('view-route', { routeSheetDetails });
    } catch (err) {
        console.error(err);
        res.send('Error al ver la hoja de ruta.');
    }
};
