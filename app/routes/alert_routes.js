const pool = require("../../config/db");

module.exports = function(app) {
  app.get("/api/alert", (req, res) => {
    var phone = req.query.phone;

    pool.query("SELECT * FROM alerts WHERE phone='" + phone + "';", function(
      err,
      dbres
    ) {
      if (err) {
        return console.error("error running query", err);
      }
      if (dbres.rows.length > 0) {
        var result = {};
        result["inst"] = false;
        result["alerts"] = dbres.rows;
        res.status(200).send(result);
      } else {
        pool.query(
          "SELECT * FROM institutions WHERE phone='" + phone + "';",
          function(err1, dbres1) {
            if (err) {
              return console.error("error running query", err1);
            }
            if (dbres1.rows.length > 0) {
              var result = {};
              result["inst"] = true;
              result["alerts"] = dbres1.rows;
              res.status(200).send(result);
            } else {
              res.sendStatus(404);
            }
          }
        );
      }
    });
  });

  app.post("/api/register", (req, res) => {
    var lat = req.body.lat;
    var long = req.body.long;
    var radius = req.body.rad;
    var name = req.body.institution;
    var phone = req.body.phone;
    var contact_name = req.body.name;
  });
};
