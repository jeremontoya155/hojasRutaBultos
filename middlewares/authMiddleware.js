// middlewares/authMiddleware.js
module.exports = (req, res, next) => {
    if (req.session && req.session.user) {
        // Si el usuario está autenticado, continúa con la siguiente función
        next();
    } else {
        // Si no está autenticado, redirige al login
        res.redirect('/login');
    }
};
// middlewares/authMiddleware.js
module.exports = (req, res, next) => {
    if (req.session && req.session.user) {
        // Si el usuario está autenticado, continúa con la siguiente función
        next();
    } else {
        // Si no está autenticado, redirige al login
        res.redirect('/login');
    }
};
