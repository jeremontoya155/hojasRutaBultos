// Cargar las variables de entorno desde .env
require('dotenv').config();

// Importar módulos necesarios
const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const repartoRoutes = require('./routes/repartoRoutes');
const authMiddleware = require('./middlewares/authMiddleware');

// Configurar el motor de plantillas EJS
app.set('view engine', 'ejs');

// Middleware para procesar datos del formulario
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de la sesión
app.use(session({
    secret: 'your_secret_key',  // Cambiar en producción
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  // Cambiar a true si se usa HTTPS
}));

// Configuración para servir archivos estáticos (CSS, JS, imágenes, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de autenticación
app.use('/login', authRoutes);
app.use('/', authRoutes); // Redirigir a las rutas de login

// Rutas protegidas por middleware de autenticación
app.use('/admin', authMiddleware, adminRoutes);
app.use('/my-routes', authMiddleware, userRoutes);
app.use('/reparto', authMiddleware, repartoRoutes); // Rutas de reparto

// Captura de errores para rutas no encontradas
app.use((req, res, next) => {
    res.status(404).render('404', { url: req.originalUrl });
});

// Verificación de la hora actual en Buenos Aires
console.log("Hora actual en Buenos Aires: ", new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }));

// Iniciar el servidor en el puerto definido en el archivo .env o en el puerto 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
