const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

exports.getRouteSheets = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nombreHojaRuta, status, created_at, fecha_recepcion, received, repartidor FROM route_sheets ORDER BY created_at DESC');
        const routeSheets = result.rows;
        res.render('admin', { routeSheets });
    } catch (err) {
        console.error(err);
        res.send('Error al obtener las hojas de ruta.');
    }
};
exports.createRouteSheet = async (req, res) => {
    const { repartidor, data } = req.body;

    try {
        const result = await pool.query('INSERT INTO route_sheets (status, repartidor, created_at) VALUES ($1, $2, NOW()) RETURNING id', [
            'pending',
            repartidor
        ]);
        const routeSheetId = result.rows[0].id;

        const nombreHojaRuta = `Hoja de ruta ID ${routeSheetId}`;
        await pool.query('UPDATE route_sheets SET nombreHojaRuta = $1 WHERE id = $2', [
            nombreHojaRuta,
            routeSheetId
        ]);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (let sucursalData of data) {
                const parsedData = JSON.parse(sucursalData);
                const sucursal = parsedData.sucursal;
                const codigos = parsedData.codigos;
                const cantidadBultos = codigos.length;

                // Guardar los detalles en `route_sheet_details`
                await client.query(
                    'INSERT INTO route_sheet_details (route_sheet_id, sucursal, cantidad_bultos, refrigerados, cantidad_refrigerados) VALUES ($1, $2, $3, $4, $5)',
                    [routeSheetId, sucursal, cantidadBultos, false, 0]
                );

                // Guardar los códigos escaneados en `route_sheet_scans`
                const queryText = 'INSERT INTO route_sheet_scans (route_sheet_id, sucursal, codigo) VALUES ($1, $2, $3)';
                for (let codigo of codigos) {
                    await client.query(queryText, [routeSheetId, sucursal, codigo]);
                }
            }
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
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
        await pool.query('UPDATE route_sheets SET received = TRUE, fecha_recepcion = NOW() WHERE id = $1', [routeSheetId]);
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.send('Error al marcar como recibida la hoja de ruta.');
    }
};
exports.editRouteSheet = async (req, res) => {
    const routeSheetId = req.params.id;
    try {
        // Obtener la hoja de ruta
        const routeSheetResult = await pool.query('SELECT * FROM route_sheets WHERE id = $1', [routeSheetId]);
        const routeSheet = routeSheetResult.rows[0];

        // Obtener los detalles de la hoja de ruta
        const detailsResult = await pool.query('SELECT * FROM route_sheet_details WHERE route_sheet_id = $1', [routeSheetId]);
        const routeSheetDetails = detailsResult.rows;

        res.render('edit-route', { routeSheetId, routeSheet, routeSheetDetails });
    } catch (err) {
        console.error(err);
        res.send('Error al obtener los datos de la hoja de ruta.');
    }
};




exports.updateRouteSheet = async (req, res) => {
    const routeSheetId = req.params.id;
    const { nombreHojaRuta, sucursal, cantidad_bultos, refrigerados, cantidad_refrigerados, repartidor } = req.body;

    try {
        await pool.query('UPDATE route_sheets SET nombreHojaRuta = $1, repartidor = $2 WHERE id = $3', [
            nombreHojaRuta,
            repartidor,
            routeSheetId
        ]);

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

exports.loadRouteSheet = async (req, res) => {
    try {
        const repartidores = await pool.query('SELECT * FROM repartidores');
        res.render('load-route', { repartidores: repartidores.rows });
    } catch (err) {
        console.error(err);
        res.send('Error al cargar la página de nueva hoja de ruta.');
    }
};

exports.viewRouteSheetDetail = async (req, res) => {
    const { id, sucursal } = req.params;

    try {
        const detailsResult = await pool.query('SELECT id, codigo FROM route_sheet_scans WHERE route_sheet_id = $1 AND sucursal = $2', [id, sucursal]);
        const routeSheetDetails = detailsResult.rows;

        res.render('view-route-detail', { routeSheetId: id, sucursal, routeSheetDetails });
    } catch (err) {
        console.error(err);
        res.send('Error al obtener los detalles de la sucursal.');
    }
};


exports.viewRouteSheet = async (req, res) => {
    const routeSheetId = req.params.id;

    try {
        // Consulta para obtener los detalles específicos de cada sucursal en la hoja de ruta
        const detailsResult = await pool.query(`
            SELECT sucursal, SUM(cantidad_bultos) as cantidad_bultos, 
                   refrigerados, SUM(cantidad_refrigerados) as cantidad_refrigerados
            FROM route_sheet_details 
            WHERE route_sheet_id = $1 
            GROUP BY sucursal, refrigerados`, [routeSheetId]);

        const routeSheetDetails = detailsResult.rows;

        // Renderiza la vista con los detalles de la hoja de ruta
        res.render('view-route', { routeSheetId, routeSheetDetails });
    } catch (err) {
        console.error(err);
        res.send('Error al obtener los detalles de la hoja de ruta.');
    }
};




exports.viewRouteSheetGeneral = async (req, res) => {
    const routeSheetId = req.params.id;

    try {
        const detailsResult = await pool.query(`
            SELECT sucursal, SUM(cantidad_bultos) as cantidad_bultos, 
                   refrigerados, SUM(cantidad_refrigerados) as cantidad_refrigerados
            FROM route_sheet_details 
            WHERE route_sheet_id = $1 
            GROUP BY sucursal, refrigerados`, [routeSheetId]);

        const routeSheetDetails = detailsResult.rows;

        res.render('view-route-general', { routeSheetId, routeSheetDetails });
    } catch (err) {
        console.error(err);
        res.send('Error al obtener los detalles de la hoja de ruta.');
    }
};


