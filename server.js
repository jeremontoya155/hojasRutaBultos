require('dotenv').config();
const express = require('express');
const app = express();
const authRoutes = require('./routes/authRoutes');

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

app.use('/', authRoutes);

app.listen(process.env.PORT || 3000, () => {
    console.log(`Servidor corriendo en el puerto ${process.env.PORT || 3000}`);
});
