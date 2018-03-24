const alertRoutes = require("./alert_routes");

module.exports = function(app, db) {
  alertRoutes(app, db);
};
