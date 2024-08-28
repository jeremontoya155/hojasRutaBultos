const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

exports.viewAllRouteSheets = async (req, res) => {
    try {
        // Obtener todas las hojas de ruta
        const result = await pool.query('SELECT * FROM route_sheets ORDER BY created_at DESC');
        const routeSheets = result.rows;

        // Verifica si realmente se están recuperando datos
        console.log("Hojas de ruta obtenidas:", routeSheets);

        // Obtener los detalles de cada hoja de ruta
        const detailsPromises = routeSheets.map(sheet => {
            return pool.query('SELECT * FROM route_sheet_details WHERE route_sheet_id = $1', [sheet.id])
                .then(result => {
                    sheet.details = result.rows;
                    return sheet;
                });
        });

        const routeSheetsWithDetails = await Promise.all(detailsPromises);

        // Verifica si los detalles se están agregando correctamente
        console.log("Hojas de ruta con detalles:", routeSheetsWithDetails);

        res.render('reparto', { routeSheets: routeSheetsWithDetails });
    } catch (err) {
        console.error(err);
        res.send('Error al obtener las hojas de ruta.');
    }
};

