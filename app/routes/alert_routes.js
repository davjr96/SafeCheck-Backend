const pool = require("../../config/db");
const cred = require("../../config/cred");
const client = require("twilio")(cred.accountSid, cred.authToken);
var request = require("request");

module.exports = function(app) {
  function sendAlert(lat, long, emergency) {
    console.log(emergency);
    pool.query(
      "SELECT institutions.phone FROM institutions WHERE earth_box(ll_to_earth(" +
        lat +
        " ," +
        long +
        "),institutions.radius) @> ll_to_earth(institutions.lat, institutions.long);",
      function(err2, dbres2) {
        if (err2) {
          return console.error("error running query", err2);
        }
        if (dbres2.rows.length > 0) {
          if (emergency === "false") {
            client.messages
              .create({
                to: dbres2.rows[0]["phone"],
                from: "+16173000841",
                body:
                  "There has been an alert in your location! Open SafeCheck App for more info."
              })
              .then(message => console.log(message.sid));
          } else {
            client.messages
              .create({
                to: dbres2.rows[0]["phone"],
                from: "+16173000841",
                body:
                  "There has been an alert in your location! Emergency Services have been notified Open SafeCheck App for more info."
              })
              .then(message => console.log(message.sid));

            var options = {
              method: "POST",
              url: "https://api-sandbox.safetrek.io/v1/alarms",
              headers: {
                Authorization: "Bearer " + cred.accessToken,
                "Content-Type": "application/json"
              },
              body: {
                services: { police: true, fire: false, medical: false },
                "location.coordinates": {
                  lat: parseFloat(lat),
                  lng: parseFloat(long),
                  accuracy: 5
                }
              },
              json: true
            };
            request(options, function(error, response, body) {
              if (error) throw new Error(error);
              console.log(body);
            });
          }
        }
      }
    );
  }
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
            if (err1) {
              return console.error("error running query", err1);
            }
            if (dbres1.rows.length > 0) {
              var result = {};
              result["inst"] = true;
              inst = dbres1.rows[0];

              pool.query(
                "SELECT * FROM alerts WHERE earth_box(ll_to_earth(" +
                  inst["lat"] +
                  " ," +
                  inst["long"] +
                  ")," +
                  inst["radius"] +
                  ") @> ll_to_earth(alerts.lat, alerts.long);",
                function(err2, dbres2) {
                  if (err2) {
                    return console.error("error running query", err2);
                  }
                  result["alerts"] = dbres2.rows;
                  res.status(200).send(result);
                }
              );
            } else {
              res.sendStatus(404);
            }
          }
        );
      }
    });
  });

  app.post("/api/alert", (req, res) => {
    var phone = req.body.phone;
    var lat = req.body.lat;
    var long = req.body.long;
    var emergency = req.body.emergency;

    pool.query(
      "INSERT INTO alerts (phone,lat,long,emergency,status) VALUES (" +
        "'" +
        [phone, lat, long, emergency, "Open"].join("','") +
        "'" +
        ");",
      function(err, dbres) {
        if (err) {
          return console.error("error running query", err);
        }
        sendAlert(lat, long, emergency);

        res.sendStatus(201);
      }
    );
  });

  app.put("/api/alert", (req, res) => {
    var phone = req.body.phone;
    var status = req.body.status;
    var description = req.body.description;
    var location_detail = req.body.location_detail;

    if (status === "Closed") {
      pool.query("DELETE FROM alerts WHERE phone='" + phone + "';", function(
        err,
        dbres
      ) {
        if (err) {
          return console.error("error running query", err);
        }
        res.sendStatus(200);
      });
    } else {
      pool.query(
        "UPDATE alerts SET status='" +
          status +
          "',description='" +
          description +
          "',location_detail='" +
          location_detail +
          "' WHERE phone='" +
          phone +
          "';",
        function(err, dbres) {
          if (err) {
            return console.error("error running query", err);
          }
          res.sendStatus(200);
        }
      );
    }
  });
};
