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
        // Obtener hojas de ruta con estado "sent"
        const result = await pool.query(`
            SELECT id, nombreHojaRuta, status, situacion, created_at, fecha_recepcion, received, repartidor 
            FROM route_sheets 
            WHERE status = 'sent' 
            ORDER BY created_at DESC
        `);
        const routeSheets = result.rows;

        const detailsPromises = routeSheets.map(sheet => {
            return pool.query(`
                SELECT rsd.sucursal, rsd.situacion, array_agg(rss.codigo) as codigos
                FROM route_sheet_details rsd
                LEFT JOIN route_sheet_scans rss ON rsd.route_sheet_id = rss.route_sheet_id AND rsd.sucursal = rss.sucursal
                WHERE rsd.route_sheet_id = $1
                GROUP BY rsd.sucursal, rsd.situacion
            `, [sheet.id]).then(result => {
                const sucursales = result.rows;

                // Agrupar y combinar detalles por sucursal
                const sucursalesAgrupadas = sucursales.reduce((acc, sucursal) => {
                    const codigos = sucursal.codigos || [];
                    let clasificacion = {};

                    codigos.forEach(codigo => {
                        if (codigo) { // Verificar que no sea null
                            const tipo = classificationCriteria[codigo.charAt(0)] || "Desconocido";
                            clasificacion[tipo] = (clasificacion[tipo] || 0) + 1;
                        }
                    });

                    // Si la sucursal ya existe en el acumulador, combinar los detalles
                    const existente = acc.find(item => item.sucursal === sucursal.sucursal);
                    if (existente) {
                        existente.total_bultos += codigos.length;
                        for (const [tipo, cantidad] of Object.entries(clasificacion)) {
                            existente.clasificacion[tipo] = (existente.clasificacion[tipo] || 0) + cantidad;
                        }
                    } else {
                        // Si no existe, agregarla como una nueva entrada
                        acc.push({
                            sucursal: sucursal.sucursal,
                            situacion: sucursal.situacion,
                            total_bultos: codigos.length,
                            clasificacion: clasificacion
                        });
                    }

                    return acc;
                }, []);

                sheet.sucursales = sucursalesAgrupadas;
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



// Controlador para marcar la sucursal como "Entregado" usando el checkbox
exports.confirmarEntrega = async (req, res) => {
    const { routeSheetId, sucursalId } = req.body;

    try {
        // Actualizar la situación de la sucursal a "Entregado"
        await pool.query(`
            UPDATE route_sheet_details 
            SET situacion = 'Entregado' 
            WHERE route_sheet_id = $1 AND sucursal = $2
        `, [routeSheetId, sucursalId]);

        res.status(200).send('Sucursal marcada como Entregado');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al marcar la sucursal como Entregado');
    }
};



// Función para marcar una hoja de ruta y todas sus sucursales como "En camino"
exports.marcarHojaEnCamino = async (req, res) => {
    const routeSheetId = req.params.routeSheetId;

    try {
        // Actualizar todas las sucursales de la hoja de ruta específica
        await pool.query(`
            UPDATE route_sheet_details
            SET situacion = 'En camino'
            WHERE route_sheet_id = $1
        `, [routeSheetId]);

        // Actualizar la hoja de ruta a 'En camino'
        await pool.query(`
            UPDATE route_sheets
            SET situacion = 'En camino'
            WHERE id = $1
        `, [routeSheetId]);

        res.status(200).send('Hoja de ruta y sucursales marcadas como En camino');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al marcar la hoja de ruta como En camino');
    }
};
