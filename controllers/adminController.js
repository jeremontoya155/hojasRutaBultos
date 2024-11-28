const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});


const mysqlPool = require('../mysqlConnection');

// Definición de classificationCriteria
const classificationCriteria = {
    "1": "Cajas",
    "2": "Cubetas",
    "3": "Refrigerado",
    "4": "Bolsas",
    "5": "Encargado",
    "6": "Varios"
};

exports.getRouteSheets = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                rs.id, 
                rs.nombrehojaruta, 
                rs.status, 
                rs.created_at, 
                rs.fecha_recepcion, 
                rs.received, 
                rs.repartidor, 
                rs.situacion,  -- Incluye la columna situacion
                COALESCE(SUM(DISTINCT rsd.cantidad_bultos), 0) AS total_bultos, 
                BOOL_OR(SUBSTRING(rss.codigo FROM 1 FOR 1) = '3') AS tiene_refrigerados
            FROM 
                route_sheets rs
            LEFT JOIN 
                route_sheet_details rsd ON rs.id = rsd.route_sheet_id
            LEFT JOIN
                route_sheet_scans rss ON rsd.route_sheet_id = rss.route_sheet_id
            GROUP BY 
                rs.id, 
                rs.nombrehojaruta, 
                rs.status, 
                rs.created_at, 
                rs.fecha_recepcion, 
                rs.received, 
                rs.repartidor, 
                rs.situacion  -- Agrupa también por situacion
            ORDER BY 
                rs.created_at DESC
        `);
        
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
        const result = await pool.query(
            `INSERT INTO route_sheets (status, repartidor, situacion) 
            VALUES ($1, $2, $3) 
            RETURNING id`,
            ['pending', repartidor, 'En preparación']
        );

        const routeSheetId = result.rows[0].id;
        const nombreHojaRuta = `Hoja de ruta ID ${routeSheetId}`;

        await pool.query('UPDATE route_sheets SET nombreHojaRuta = $1 WHERE id = $2', [
            nombreHojaRuta,
            routeSheetId
        ]);

        // Obtener los remitos del día
        const [remitos] = await mysqlPool.query(`
            SELECT factcabecera.CliApeNom, factcabecera.Numero 
            FROM factcabecera
            WHERE factcabecera.Emision = CURDATE()
            AND factcabecera.Tipo = 'RM'
        `);

        console.log("Remitos disponibles:", remitos);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (let sucursalData of data) {
                const parsedData = JSON.parse(sucursalData);
                const sucursal = parsedData.sucursal;
                const codigos = parsedData.codigos;
                const remitosSeleccionados = parsedData.remitos;

                console.log(`Sucursal: ${sucursal}, Remitos seleccionados:`, remitosSeleccionados);

                // Filtrar remitos válidos para la sucursal seleccionada
                const remitosParaSucursal = remitos.filter(remito =>
                    remito.CliApeNom.endsWith(` ${sucursal}`)
                );

                console.log("Remitos asociados a la sucursal:", remitosParaSucursal);

                const remitosValidos = remitosSeleccionados.filter(numero =>
                    remitosParaSucursal.some(remito => remito.Numero.toString() === numero)
                );

                console.log("Remitos válidos para esta sucursal:", remitosValidos);

                if (remitosSeleccionados.length !== remitosValidos.length) {
                    console.error("Remitos no válidos:", remitosSeleccionados.filter(numero => !remitosValidos.includes(numero)));
                    throw new Error('Uno o más remitos seleccionados no son válidos.');
                }

                const remitosConcatenados = remitosValidos.join('-');

                await client.query(
                    'INSERT INTO route_sheet_details (route_sheet_id, sucursal, cantidad_bultos, refrigerados, cantidad_refrigerados, numero_remito) VALUES ($1, $2, $3, $4, $5, $6)',
                    [routeSheetId, sucursal, codigos.length, false, 0, remitosConcatenados]
                );

                const queryText = 'INSERT INTO route_sheet_scans (route_sheet_id, sucursal, codigo) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING';
                for (let codigo of codigos) {
                    await client.query(queryText, [routeSheetId, sucursal, codigo]);
                }
            }

            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            console.error("Error al procesar la hoja de ruta:", err.message);
            throw err;
        } finally {
            client.release();
        }

        res.redirect('/admin');
    } catch (err) {
        console.error("Error general:", err.message);
        res.status(400).send(err.message);
    }
};



exports.receiveRouteSheet = async (req, res) => {
    const routeSheetId = req.params.id;

    try {
        // Usar la hora de Buenos Aires al actualizar el registro de recepción
        await pool.query(`
            UPDATE route_sheets 
            SET received = TRUE, fecha_recepcion = NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires' 
            WHERE id = $1`, [routeSheetId]);

        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.send('Error al marcar como recibida la hoja de ruta.');
    }
};

exports.editRouteSheet = async (req, res) => {
    const routeSheetId = req.params.id;
    try {
        const repartidoresResult = await pool.query('SELECT * FROM repartidores');
        const repartidores = repartidoresResult.rows;

        const detailsResult = await pool.query(`
            SELECT rsd.sucursal, rsd.cantidad_bultos, rsd.refrigerados, rsd.cantidad_refrigerados, rss.codigo
            FROM route_sheet_details rsd
            LEFT JOIN route_sheet_scans rss ON rsd.route_sheet_id = rss.route_sheet_id AND rsd.sucursal = rss.sucursal
            WHERE rsd.route_sheet_id = $1
        `, [routeSheetId]);
        const routeSheetDetails = detailsResult.rows;

        const selectedRepartidor = (routeSheetDetails.length > 0) ? routeSheetDetails[0].repartidor : null;

        res.render('edit-route', {
            routeSheetId,
            routeSheetDetails,
            repartidores,
            sucursales: repartidores.map(rep => rep.recorrido).flat(),
            selectedRepartidor
        });
    } catch (err) {
        console.error(err);
        res.send('Error al editar la hoja de ruta.');
    }
};

exports.editRouteSheetDetail = async (req, res) => {
    const { id, sucursal } = req.params;

    try {
        const detailsResult = await pool.query('SELECT id, codigo FROM route_sheet_scans WHERE route_sheet_id = $1 AND sucursal = $2', [id, sucursal]);
        const routeSheetDetails = detailsResult.rows;

        res.render('edit-route-detail', { routeSheetId: id, sucursal, routeSheetDetails });
    } catch (err) {
        console.error(err);
        res.send('Error al obtener los detalles de la sucursal.');
    }
};

exports.updateRouteSheetDetail = async (req, res) => {
    const { id, sucursal } = req.params;
    const { new_codes, delete_codes } = req.body;

    try {
        // Eliminar los códigos seleccionados
        if (delete_codes && delete_codes.length > 0) {
            await pool.query('DELETE FROM route_sheet_scans WHERE id = ANY($1)', [delete_codes]);

            // Actualizar la cantidad de bultos después de la eliminación
            const bultosResult = await pool.query(
                'SELECT COUNT(*) FROM route_sheet_scans WHERE route_sheet_id = $1 AND sucursal = $2',
                [id, sucursal]
            );
            const cantidad_bultos = bultosResult.rows[0].count;

            await pool.query(
                'UPDATE route_sheet_details SET cantidad_bultos = $1 WHERE route_sheet_id = $2 AND sucursal = $3',
                [cantidad_bultos, id, sucursal]
            );
        }

        // Insertar nuevos códigos
        if (new_codes && new_codes.length > 0) {
            for (let codigo of new_codes) {
                await pool.query('INSERT INTO route_sheet_scans (route_sheet_id, sucursal, codigo) VALUES ($1, $2, $3)', [
                    id,
                    sucursal,
                    codigo
                ]);
            }

            // Actualizar la cantidad de bultos después de agregar nuevos códigos
            const bultosResult = await pool.query(
                'SELECT COUNT(*) FROM route_sheet_scans WHERE route_sheet_id = $1 AND sucursal = $2',
                [id, sucursal]
            );
            const cantidad_bultos = bultosResult.rows[0].count;

            await pool.query(
                'UPDATE route_sheet_details SET cantidad_bultos = $1 WHERE route_sheet_id = $2 AND sucursal = $3',
                [cantidad_bultos, id, sucursal]
            );
        }

        res.redirect(`/admin/edit-route/${id}`);
    } catch (err) {
        console.error(err);
        res.send('Error al actualizar los detalles de la sucursal.');
    }
};


exports.updateRouteSheet = async (req, res) => {
    const routeSheetId = req.params.id;
    const { repartidor, sucursal, cantidad_bultos, refrigerados, cantidad_refrigerados, delete_codes } = req.body;

    try {
        await pool.query('UPDATE route_sheets SET repartidor = $1 WHERE id = $2', [
            repartidor,
            routeSheetId
        ]);

        await pool.query('DELETE FROM route_sheet_details WHERE route_sheet_id = $1', [routeSheetId]);

        if (sucursal && Array.isArray(sucursal)) {
            for (let i = 0; i < sucursal.length; i++) {
                await pool.query('INSERT INTO route_sheet_details (route_sheet_id, sucursal, cantidad_bultos, refrigerados, cantidad_refrigerados) VALUES ($1, $2, $3, $4, $5)', [
                    routeSheetId,
                    sucursal[i],
                    cantidad_bultos[i],
                    refrigerados[i] === 'true',
                    refrigerados[i] === 'true' ? cantidad_refrigerados[i] : null
                ]);
            }
        }

        if (delete_codes && delete_codes.length > 0) {
            await pool.query('DELETE FROM route_sheet_scans WHERE id = ANY($1)', [delete_codes]);
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
        // Cambia el estado a "sent" y la situación a "Listo para reparto"
        await pool.query(`
            UPDATE route_sheets 
            SET status = $1, situacion = $2 
            WHERE id = $3`, 
            ['sent', 'Listo para reparto', routeSheetId]
        );

        res.redirect('/admin'); // Redirige de vuelta al panel de administración
    } catch (err) {
        console.error(err);
        res.send('Error al enviar la hoja de ruta.');
    }
};


exports.loadRouteSheet = async (req, res) => {
    try {
        const repartidores = await pool.query('SELECT * FROM repartidores');
        const [remitosDisponibles] = await mysqlPool.query(`
            SELECT factcabecera.Numero, factcabecera.CliApeNom 
            FROM factcabecera
            WHERE factcabecera.Emision = CURDATE()
            AND factcabecera.Tipo = 'RM'
        `);

        res.render('load-route', {
            repartidores: repartidores.rows,
            remitosDisponibles
        });
    } catch (err) {
        console.error(err);
        res.send('Error al cargar la página de nueva hoja de ruta.');
    }
};


exports.viewRouteSheetDetail = async (req, res) => {
    const { id, sucursal } = req.params;

    // Definición de classificationCriteria
    const classificationCriteria = {
        "1": "Cajas",
        "2": "Cubetas",
        "3": "Refrigerado",
        "4": "Bolsas",
        "5": "Encargado",
        "6": "Varios"
    };

    try {
        // Obtener los códigos escaneados de la sucursal en la hoja de ruta
        const detailsResult = await pool.query(`
            SELECT id, codigo 
            FROM route_sheet_scans 
            WHERE route_sheet_id = $1 
            AND sucursal = $2
        `, [id, sucursal]);

        const routeSheetDetails = detailsResult.rows;

        // Clasificación de los códigos según el criterio
        const classifiedDetails = routeSheetDetails.map(detail => ({
            codigo: detail.codigo,
            tipo: classificationCriteria[detail.codigo.charAt(0)] || "Desconocido"
        }));

        res.render('view-route-detail', { 
            routeSheetId: id, 
            sucursal, 
            routeSheetDetails: classifiedDetails, 
            classificationCriteria 
        });
    } catch (err) {
        console.error(err);
        res.send('Error al obtener los detalles de la sucursal.');
    }
};


exports.viewRouteSheet = async (req, res) => {
    const routeSheetId = req.params.id;

    try {
        const detailsResult = await pool.query(`
            SELECT sucursal, SUM(cantidad_bultos) as cantidad_bultos, 
                   refrigerados, SUM(cantidad_refrigerados) as cantidad_refrigerados
            FROM route_sheet_details 
            WHERE route_sheet_id = $1 
            GROUP BY sucursal, refrigerados`, [routeSheetId]);

        const routeSheetDetails = detailsResult.rows;

        res.render('view-route', { routeSheetId, routeSheetDetails });
    } catch (err) {
        console.error(err);
        res.send('Error al obtener los detalles de la hoja de ruta.');
    }
};
exports.viewRouteSheetGeneral = async (req, res) => {
    const routeSheetId = req.params.id;

    const classificationCriteria = {
        "1": "Cajas",
        "2": "Cubetas",
        "3": "Refrigerado",
        "4": "Bolsas",
        "5": "Encargado",
        "6": "Varios"
    };

    try {
        const detailsResult = await pool.query(`
            SELECT rsd.sucursal, rsd.situacion, rsd.fecha_recepcion, rsd.numero_remito, array_agg(rss.codigo) as codigos
            FROM route_sheet_details rsd
            LEFT JOIN route_sheet_scans rss ON rsd.route_sheet_id = rss.route_sheet_id AND rsd.sucursal = rss.sucursal
            WHERE rsd.route_sheet_id = $1
            GROUP BY rsd.sucursal, rsd.situacion, rsd.fecha_recepcion, rsd.numero_remito
        `, [routeSheetId]);

        let routeSheetDetails = [];
        let summaryByType = {};

        detailsResult.rows.forEach(detail => {
            // Asegúrate de que `codigos` sea un array
            const codigos = detail.codigos ? detail.codigos.filter(codigo => codigo !== null) : [];
            let cantidadRefrigerados = 0;
            let refrigerados = false;

            let sucursalSummary = {};

            codigos.forEach(codigo => {
                const tipo = classificationCriteria[codigo.charAt(0)] || "Desconocido";
                sucursalSummary[tipo] = (sucursalSummary[tipo] || 0) + 1;

                if (tipo === "Refrigerado") {
                    refrigerados = true;
                    cantidadRefrigerados++;
                }
            });

            for (let tipo in sucursalSummary) {
                summaryByType[tipo] = (summaryByType[tipo] || 0) + sucursalSummary[tipo];
            }

            routeSheetDetails.push({
                sucursal: detail.sucursal,
                cantidad_bultos: codigos.length,
                refrigerados,
                cantidad_refrigerados: cantidadRefrigerados,
                sucursalSummary,
                situacion: detail.situacion,
                fecha_recepcion: detail.fecha_recepcion,
                numero_remito: detail.numero_remito
            });
        });

        res.render('view-route-general', {
            routeSheetId,
            routeSheetDetails,
            summaryByType
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al obtener los detalles de la hoja de ruta.');
    }
};


exports.editRouteSheetAdvanced = async (req, res) => {
    const routeSheetId = req.params.id;

    const classificationCriteria = {
        "1": "Cajas",
        "2": "Cubetas",
        "3": "Refrigerado",
        "4": "Bolsas",
        "5": "Encargado",
        "6": "Varios"
    };

    try {
        const repartidoresResult = await pool.query('SELECT * FROM repartidores');
        const repartidores = repartidoresResult.rows;

        const routeSheetResult = await pool.query('SELECT * FROM route_sheets WHERE id = $1', [routeSheetId]);
        const routeSheet = routeSheetResult.rows[0];

        const detailsResult = await pool.query(`
            SELECT rsd.sucursal, array_agg(rss.codigo) as codigos
            FROM route_sheet_details rsd
            LEFT JOIN route_sheet_scans rss ON rsd.route_sheet_id = rss.route_sheet_id AND rsd.sucursal = rss.sucursal
            WHERE rsd.route_sheet_id = $1
            GROUP BY rsd.sucursal
        `, [routeSheetId]);

        const routeSheetDetails = detailsResult.rows.map(detail => {
            let sucursalSummary = {
                "Cajas": 0,
                "Cubetas": 0,
                "Refrigerado": 0,
                "Bolsas": 0,
                "Encargado": 0,
                "Varios": 0
            };

            (detail.codigos || []).forEach(codigo => {
                const tipo = classificationCriteria[codigo.charAt(0)] || "Desconocido";
                if (sucursalSummary[tipo] !== undefined) {
                    sucursalSummary[tipo]++;
                }
            });

            return {
                ...detail,
                codigos: (detail.codigos || []).map(codigo => ({
                    codigo,
                    categoria: classificationCriteria[codigo.charAt(0)] || "Desconocido"
                })),
                sucursalSummary
            };
        });

        // Buscar el repartidor asignado
        const assignedRepartidor = repartidores.find(rep => rep.nombre === routeSheet.repartidor) || { nombre: "No asignado" };

        res.render('edit-route-advanced', {
            routeSheetId,
            routeSheet,
            routeSheetDetails,
            repartidores,
            sucursales: repartidores.map(rep => rep.recorrido).flat(),
            assignedRepartidor // Garantiza que siempre haya un objeto con al menos un campo `nombre`
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al cargar la vista de edición avanzada.');
    }
};



exports.updateRouteSheetAdvanced = async (req, res) => {
    const routeSheetId = req.params.id;
    const { delete_codes } = req.body;

    try {
        // Eliminar los códigos marcados para eliminación
        if (delete_codes) {
            const codesToDelete = delete_codes.split(',').map(code => code.trim());
            if (codesToDelete.length > 0) {
                await pool.query('DELETE FROM route_sheet_scans WHERE route_sheet_id = $1 AND codigo = ANY($2::text[])', [routeSheetId, codesToDelete]);
            }
        }

        // Eliminamos los detalles existentes de la hoja de ruta
        await pool.query('DELETE FROM route_sheet_details WHERE route_sheet_id = $1', [routeSheetId]);

        // Obtenemos las claves de sucursales y códigos desde el formulario
        const sucursales = Object.keys(req.body)
            .filter(key => key.startsWith('sucursal_'))
            .map(key => req.body[key]);

        const codigosKeys = Object.keys(req.body).filter(key => key.startsWith('codigos_'));

        // Reinsertamos los detalles de las sucursales y los códigos asociados
        for (let i = 0; i < sucursales.length; i++) {
            const sucursal = sucursales[i];
            const codigosArray = req.body[codigosKeys[i]].split(',').map(codigo => codigo.trim());

            // Validar si hay códigos duplicados
            const uniqueCodes = [...new Set(codigosArray)];
            if (uniqueCodes.length !== codigosArray.length) {
                return res.status(400).send('Error: Existen códigos de barra duplicados.');
            }

            // Insertamos los detalles de la sucursal
            await pool.query('INSERT INTO route_sheet_details (route_sheet_id, sucursal, cantidad_bultos, refrigerados, cantidad_refrigerados) VALUES ($1, $2, $3, $4, $5)', [
                routeSheetId,
                sucursal,
                uniqueCodes.length,
                false,
                0
            ]);

            // Insertamos los códigos escaneados asociados a la sucursal
            for (let codigo of uniqueCodes) {
                const categoria = classificationCriteria[codigo.charAt(0)] || "Desconocido";
                try {
                    await pool.query('INSERT INTO route_sheet_scans (route_sheet_id, sucursal, codigo, categoria) VALUES ($1, $2, $3, $4)', [
                        routeSheetId,
                        sucursal,
                        codigo,
                        categoria
                    ]);
                } catch (err) {
                    if (err.code !== '23505') { // Ignorar errores de duplicados en la base de datos
                        throw err;
                    }
                }
            }
        }

        // Redirigimos al administrador después de guardar los cambios
        res.redirect('/admin');
    } catch (err) {
        console.error(err);
        res.send('Error al actualizar la hoja de ruta.');
    }
};

//Remitos finales


exports.getRemitos = async (req, res) => {
    try {
        const [rows] = await mysqlPool.query(`
            SELECT factcabecera.CliApeNom, factcabecera.Numero 
            FROM factcabecera
            WHERE factcabecera.Emision = CURDATE() 
            AND factcabecera.Tipo = 'RM'
        `);

        res.json(rows); // Devuelve los datos al cliente
    } catch (err) {
        console.error('Error al obtener remitos:', err);
        res.status(500).send('Error al obtener los datos.');
    }
};

exports.updateRemitos = async (req, res) => {
    const { id, sucursal } = req.params;
    const { remitosSeleccionados } = req.body;

    try {
        const [remitos] = await mysqlPool.query(`SELECT factcabecera.Numero FROM factcabecera WHERE factcabecera.Emision = CURDATE() AND factcabecera.Tipo = 'RM'`);
        const remitosValidos = remitosSeleccionados.filter(numero => remitos.some(r => r.Numero === numero));

        if (remitosValidos.length !== remitosSeleccionados.length) {
            return res.status(400).send('Algunos remitos seleccionados no son válidos.');
        }

        await pool.query(
            'UPDATE route_sheet_details SET numero_remito = $1 WHERE route_sheet_id = $2 AND sucursal = $3',
            [remitosValidos.join('-'), id, sucursal]
        );

        res.send('Remitos actualizados correctamente.');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al actualizar los remitos.');
    }
};
