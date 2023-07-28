// This is middleware for restricting routes a user is not allowed to visit if not logged in
const isAuthenticatedRedirect = function (req, res, next) {
    // If the user is logged in, continue with the request to the restricted route
    if (req.user) {
        return next();
    }
    // If the user isn't' logged in, redirect them to the login page
    return res.redirect("/login");
};

const isAuthenticated = function (req, res, next) {
    // If the user is logged in, continue with the request to the restricted route
    if (req.user) {
        return next();
    }
    // If the user isn't' logged in, redirect them to the login page
    return res.status(401).send({
        message: 'Unauthorized!'
    });
};


module.exports = {
    isAuthenticated,
    isAuthenticatedRedirect
};
