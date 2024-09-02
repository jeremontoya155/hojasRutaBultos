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
            SELECT DISTINCT ON (rs.id) rs.*, rsd.sucursal, rss.codigo
            FROM route_sheets rs
            JOIN route_sheet_details rsd ON rs.id = rsd.route_sheet_id
            LEFT JOIN route_sheet_scans rss ON rs.id = rss.route_sheet_id AND rsd.sucursal = rss.sucursal
            WHERE rsd.sucursal = $1
            ORDER BY rs.id, rs.created_at DESC
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


// Ver los detalles de una hoja de ruta
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
        let refrigeradosCount = 0;

        routeSheetDetails.forEach(detail => {
            const codigo = detail.codigo;
            if (codigo) {
                const tipo = classificationCriteria[codigo.charAt(0)] || "Desconocido";
                summaryByType[tipo] = (summaryByType[tipo] || 0) + 1;

                if (codigo.charAt(0) === '3') {
                    refrigeradosCount++;
                }
            }
        });

        const tieneRefrigerados = refrigeradosCount > 0;

        res.render('view-route', { routeSheetId, routeSheetDetails, summaryByType, refrigeradosCount, tieneRefrigerados });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener los detalles de la hoja de ruta.');
    }
};

// Marcar como recibido
// Marcar como recibido
exports.markAsReceived = async (req, res) => {
    const routeSheetId = req.params.id;
    const user = req.session.user;

    try {
        // Obtener la hora actual en la zona horaria de Argentina
        const fechaRecepcion = moment.tz("America/Argentina/Buenos_Aires").format('YYYY-MM-DD HH:mm:ss');

        const result = await pool.query(`
            UPDATE route_sheets
            SET received = TRUE, fecha_recepcion = $2
            WHERE id = $1
            AND EXISTS (
                SELECT 1
                FROM route_sheet_details
                WHERE route_sheet_id = $1
                AND sucursal = $3
            )
        `, [routeSheetId, fechaRecepcion, user.sucursal]);

        if (result.rowCount > 0) {
            res.redirect('/my-routes');
        } else {
            res.status(403).send('No tienes permiso para marcar esta hoja de ruta como recibida.');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al actualizar el estado de la hoja de ruta.');
    }
};
// Cargar la página de carga de nuevas hojas de ruta
exports.loadRouteSheet = (req, res) => {
    res.render('load-route');
};
