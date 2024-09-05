const moment = require('moment-timezone');
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Obtener las hojas de ruta para el usuario de la sucursal
exports.getUserRouteSheets = async (req, res) => {
    const userSucursal = req.session.user.sucursal;
    const classificationCriteria = {
        "1": "Cajas",
        "2": "Cubetas",
        "3": "Refrigerado",
        "4": "Bolsas",
        "5": "Encargado",
        "6": "Varios"
    };

    try {
        const result = await pool.query(`
            SELECT DISTINCT ON (rs.id, rsd.sucursal) rs.*, rsd.sucursal, rsd.situacion, rsd.fecha_entregado, rss.codigo
            FROM route_sheets rs
            JOIN route_sheet_details rsd ON rs.id = rsd.route_sheet_id
            LEFT JOIN route_sheet_scans rss ON rs.id = rss.route_sheet_id AND rsd.sucursal = rss.sucursal
            WHERE rsd.sucursal = $1
            ORDER BY rs.id, rsd.sucursal, rs.created_at DESC
        `, [userSucursal]);

        const routeSheets = result.rows;

        // Resumir los tipos de códigos
        let summaryByType = {};
        routeSheets.forEach(sheet => {
            const codigo = sheet.codigo;
            if (codigo) {
                const tipo = classificationCriteria[codigo.charAt(0)] || "Desconocido";
                summaryByType[tipo] = (summaryByType[tipo] || 0) + 1;
            }
        });

        res.render('user', { routeSheets, userSucursal, summaryByType });  // Pasar la sucursal y summaryByType a la vista
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener las hojas de ruta.');
    }
};


exports.viewRouteSheet = async (req, res) => {
    const routeSheetId = req.params.id;
    const user = req.session.user;

    const classificationCriteria = {
        "1": "Cajas",
        "2": "Cubetas",
        "3": "Refrigerado",
        "4": "Bolsas",
        "5": "Encargado",
        "6": "Varios"
    };

    try {
        let query, params;
        if (user.role === 'admin') {
            // Admin ve todas las líneas de la hoja de ruta
            query = `
                SELECT rsd.*, rss.codigo 
                FROM route_sheet_details rsd
                LEFT JOIN route_sheet_scans rss ON rsd.route_sheet_id = rss.route_sheet_id AND rsd.sucursal = rss.sucursal
                WHERE rsd.route_sheet_id = $1`;
            params = [routeSheetId];
        } else {
            // Usuarios de sucursales solo ven las líneas de su sucursal
            query = `
                SELECT rsd.*, rss.codigo 
                FROM route_sheet_details rsd
                LEFT JOIN route_sheet_scans rss ON rsd.route_sheet_id = rss.route_sheet_id AND rsd.sucursal = rss.sucursal
                WHERE rsd.route_sheet_id = $1 AND rsd.sucursal = $2`;
            params = [routeSheetId, user.sucursal];
        }

        const result = await pool.query(query, params);
        const routeSheetDetails = result.rows;

        // Resumir los tipos de códigos y contar refrigerados
        let summaryByType = {};
        let detailedBreakdown = {};

        routeSheetDetails.forEach(detail => {
            const codigo = detail.codigo;
            if (codigo) {
                const tipo = classificationCriteria[codigo.charAt(0)] || "Desconocido";
                summaryByType[tipo] = (summaryByType[tipo] || 0) + 1;

                // Crear un desglose detallado por tipo
                if (!detailedBreakdown[tipo]) {
                    detailedBreakdown[tipo] = [];
                }
                detailedBreakdown[tipo].push(codigo);
            }
        });

        res.render('view-route', { routeSheetId, summaryByType, detailedBreakdown });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener los detalles de la hoja de ruta.');
    }
};


// Marcar como recibido
exports.markAsReceived = async (req, res) => {
    const routeSheetId = req.params.id;  // ID de la hoja de ruta
    const user = req.session.user;
    const sucursal = user.sucursal;  // Suponiendo que cada usuario tiene asociada una sucursal

    try {
        // Actualizar la situación del pedido de la sucursal específica a "Recibido Sucursal"
        await pool.query(`
            UPDATE route_sheet_details
            SET situacion = 'Recibido Sucursal'
            WHERE route_sheet_id = $1 AND sucursal = $2
        `, [routeSheetId, sucursal]);

        // Verificar si todos los pedidos (sucursales) asociados a la hoja de ruta están en "Recibido Sucursal"
        const result = await pool.query(`
            SELECT COUNT(*) AS total_sucursales,
                   COUNT(*) FILTER (WHERE situacion = 'Recibido Sucursal') AS recibidas
            FROM route_sheet_details
            WHERE route_sheet_id = $1
        `, [routeSheetId]);

        const { total_sucursales, recibidas } = result.rows[0];

        // Si todas las sucursales están marcadas como "Recibido Sucursal", actualizar la hoja de ruta
        if (total_sucursales === recibidas) {
            // Obtener la hora actual en la zona horaria de Buenos Aires
            const fechaRecepcion = new Date(); 

            // Actualizar el estado de la hoja de ruta completa a "Recibido Sucursal" y la fecha de recepción
            await pool.query(`
                UPDATE route_sheets
                SET situacion = 'Recibido Sucursal', fecha_recepcion = $2
                WHERE id = $1
            `, [routeSheetId, fechaRecepcion]);
        }

        // Redirigir de vuelta a la página de rutas del usuario
        res.redirect('/my-routes');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al marcar como recibida la sucursal.');
    }
};



// Cargar la página de carga de nuevas hojas de ruta
exports.loadRouteSheet = (req, res) => {
    res.render('load-route');
};
