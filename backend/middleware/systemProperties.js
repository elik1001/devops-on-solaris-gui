const logger = require(__dirname + '/../utils/winstonLogger');

let SystemProperties = require(__dirname + '/../model/systemProperties');

// get all System Propertiess
function getSystemProps(req, res, next) {
  SystemProperties.find({}, function(err, users) {
    if (err) {
      res.json(err);
    } else {
      response = {
        //"token": refreshToken,
        "token": req['refreshToken'],
        "error": false,
        "message": users,
      };
      res.json(response);
    }
  });
}

function getSystemProp() {
  return new Promise(function(resolve, reject) {
    SystemProperties.findOne({
        environment: 'development'
      },
      function(err, props) {
        if (err) {
          resolve({
            "err": err
          });
        } else {
          resolve(props);
        }
      }).lean();
  });
}

// Add/update System Propertiess
function updateSystemProp(req, res, next) {
  return new Promise(resolve => {
    let data = req.body;
    let systemPropObject = {};
    const entries = Object.entries(data);
    logger.debug('Updating log level');
    for (const [keys, value] of entries) {
      if (`${value}`) {
        if (`${value}` !== 'null' && `${value}` !== null && `${value}` !== 'redacted') {
          systemPropObject[`${keys}`] = `${value}`;
        }
        if (`${keys}` === 'winstonLogLevel') {
          logger.level = `${value}`;
        }
      } else if (`${value}` === "") {
        systemPropObject[`${keys}`] = `${value}`;
      }
    }
    SystemProperties.findOneAndUpdate({
        environment: 'development'
      }, {
        $set: systemPropObject,
      }, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      },
      function(err, result) {
        if (err) {
          res.json(result);
        } else {
          res.json(result);
        }
      });
  });
}

// delete registered user
function deleteSystemProp(req, res, next) {
  SystemProperties.deleteOne({
    _id: req.params.id
  }, function(err, result) {
    if (err) {
      res.json(err);
    } else {
      res.json(result);
    }
  });
}

module.exports = {
  getSystemProps,
  getSystemProp,
  updateSystemProp,
  deleteSystemProp
}
