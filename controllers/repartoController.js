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
        const result = await pool.query('SELECT id, nombreHojaRuta, status, created_at, fecha_recepcion, received, repartidor FROM route_sheets ORDER BY created_at DESC');
        const routeSheets = result.rows;

        const detailsPromises = routeSheets.map(sheet => {
            return pool.query(`
                SELECT rsd.sucursal, array_agg(rss.codigo) as codigos
                FROM route_sheet_details rsd
                LEFT JOIN route_sheet_scans rss ON rsd.route_sheet_id = rss.route_sheet_id AND rsd.sucursal = rss.sucursal
                WHERE rsd.route_sheet_id = $1
                GROUP BY rsd.sucursal
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
                        sucursal: sucursal.sucursal,
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
