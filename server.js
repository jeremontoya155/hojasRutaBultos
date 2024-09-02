require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');  // Necesario para manejar rutas correctamente
const app = express();
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const repartoRoutes = require('./routes/repartoRoutes');  // Integrar rutas de reparto
const authMiddleware = require('./middlewares/authMiddleware');  // Importar el middleware



app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));


// Configuración de la sesión
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Configuración para servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));


app.use('/login', authRoutes);

app.use('/', authRoutes); // Rutas de autenticación no requieren protección

// Aplicar middleware a rutas protegidas
app.use('/admin', authMiddleware, adminRoutes);
app.use('/my-routes', authMiddleware, userRoutes); // Aplicar a rutas de usuarios
app.use('/view-all-routes', authMiddleware, repartoRoutes); // Aplicar a rutas de reparto


app.listen(process.env.PORT || 3000, () => {
    console.log(`Servidor corriendo en el puerto ${process.env.PORT || 3000}`);
});
