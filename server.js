require('dotenv').config();
const express = require('express');
const session = require('express-session');
const app = express();
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const repartoRoutes = require('./routes/repartoRoutes');  // Integrar rutas de reparto

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// Configuración de la sesión
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/', userRoutes);
app.use('/', repartoRoutes);  // Usar las rutas para reparto

app.listen(process.env.PORT || 3000, () => {
    console.log(`Servidor corriendo en el puerto ${process.env.PORT || 3000}`);
});

