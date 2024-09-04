const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Criterios de clasificación
const classificationCriteria = {
    "1": "Cajas",
    "2": "Cubetas",
    "3": "Refrigerado",
    "4": "Bolsas",
    "5": "Encargado",
    "6": "Varios"
};

exports.viewAllRouteSheets = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nombreHojaRuta, status, situacion, created_at, fecha_recepcion, received, repartidor FROM route_sheets ORDER BY created_at DESC');
        const routeSheets = result.rows;

        const detailsPromises = routeSheets.map(sheet => {
            return pool.query(`
                SELECT rsd.id, rsd.sucursal, rsd.situacion, array_agg(rss.codigo) as codigos
                FROM route_sheet_details rsd
                LEFT JOIN route_sheet_scans rss ON rsd.route_sheet_id = rss.route_sheet_id AND rsd.sucursal = rss.sucursal
                WHERE rsd.route_sheet_id = $1
                GROUP BY rsd.id, rsd.sucursal
            `, [sheet.id]).then(result => {
                const sucursales = result.rows;

                // Procesar el total de bultos y la clasificación
                sheet.sucursales = sucursales.map(sucursal => {
                    const codigos = sucursal.codigos || [];
                    let clasificacion = {};

                    codigos.forEach(codigo => {
                        if (codigo) {  // Verificar que 'codigo' no sea null
                            const tipo = classificationCriteria[codigo.charAt(0)] || "Desconocido";
                            clasificacion[tipo] = (clasificacion[tipo] || 0) + 1;
                        }
                    });

                    return {
                        id: sucursal.id, // ID del detalle de la sucursal
                        sucursal: sucursal.sucursal,
                        situacion: sucursal.situacion, // Agregar situación
                        total_bultos: codigos.length,
                        clasificacion: clasificacion
                    };
                });

                return sheet;
            });
        });

        const routeSheetsWithDetails = await Promise.all(detailsPromises);

        res.render('reparto', { routeSheets: routeSheetsWithDetails });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener las hojas de ruta.');
    }
};

// Controlador para actualizar la situación
exports.updateSituacionSucursal = async (req, res) => {
    const { routeSheetId, sucursalId, nuevaSituacion } = req.body;

    try {
        // Actualizar la situación de la sucursal
        await pool.query(`
            UPDATE route_sheet_details 
            SET situacion = $1 
            WHERE route_sheet_id = $2 AND sucursal = $3
        `, [nuevaSituacion, routeSheetId, sucursalId]);

        // Verificar si todas las sucursales están "En camino" para cambiar el estado general
        const result = await pool.query(`
            SELECT COUNT(*) as total_sucursales,
                   COUNT(*) FILTER (WHERE situacion = 'En camino') as en_camino_count,
                   COUNT(*) FILTER (WHERE situacion = 'Entregado') as entregado_count
            FROM route_sheet_details
            WHERE route_sheet_id = $1
        `, [routeSheetId]);

        const { total_sucursales, en_camino_count } = result.rows[0];

        // Si todas las sucursales están "En camino", actualizar el estado general de la hoja de ruta
        if (en_camino_count == total_sucursales) {
            await pool.query(`
                UPDATE route_sheets 
                SET situacion = 'En camino' 
                WHERE id = $1
            `, [routeSheetId]);
        }

        res.status(200).send('Situación de la sucursal actualizada correctamente');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al actualizar la situación');
    }
};


exports.updateSituacionSucursal = async (req, res) => {
    const { routeSheetId, sucursalId, nuevaSituacion } = req.body;

    try {
        // Actualizar la situación de la sucursal
        await pool.query(`
            UPDATE route_sheet_details 
            SET situacion = $1 
            WHERE route_sheet_id = $2 AND sucursal = $3
        `, [nuevaSituacion, routeSheetId, sucursalId]);

        // Verificar si todas las sucursales están "En camino"
        const result = await pool.query(`
            SELECT COUNT(*) as total_sucursales,
                   COUNT(*) FILTER (WHERE situacion = 'En camino') as en_camino_count
            FROM route_sheet_details
            WHERE route_sheet_id = $1
        `, [routeSheetId]);

        const { total_sucursales, en_camino_count } = result.rows[0];

        // Si todas las sucursales están "En camino", actualizar el estado general
        if (en_camino_count == total_sucursales) {
            await pool.query(`
                UPDATE route_sheets 
                SET situacion = 'En camino' 
                WHERE id = $1
            `, [routeSheetId]);
        }

        res.status(200).send('Situación de la sucursal actualizada correctamente');
    } catch (err) {
        console.log("Error al actualizar la situación:", err); // Log para verificar el error
        res.status(500).send('Error al actualizar la situación');
    }
};




exports.updateSituacion = async (req, res) => {
    const { routeSheetId, sucursalId, nuevaSituacion } = req.body;

    try {
        await pool.query(`
            UPDATE route_sheet_details 
            SET situacion = $1 
            WHERE route_sheet_id = $2 AND sucursal = $3
        `, [nuevaSituacion, routeSheetId, sucursalId]);

        res.status(200).send('Situación actualizada correctamente');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al actualizar la situación');
    }
};



