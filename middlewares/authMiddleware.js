// middlewares/authAndRoleMiddleware.js
module.exports = function(roles = []) {
    return function(req, res, next) {
        // Verifica si el usuario está autenticado
        if (!req.session || !req.session.user) {
            return res.redirect('/login');  // Si no está autenticado, redirige al login
        }

        const user = req.session.user;

        // Si no se especifican roles, solo verifica si está autenticado
        if (roles.length === 0) {
            return next();  // Continúa si está autenticado y no se requiere verificación de rol
        }

        // Verifica si el rol del usuario coincide con los permitidos
        if (!roles.includes(user.role)) {
            return res.status(403).render('403', { message: 'No tienes permisos para acceder a esta página' });  // Si no tiene el rol adecuado, muestra error 403
        }

        // Si está autenticado y tiene el rol adecuado, continúa
        return next();
    };
};
