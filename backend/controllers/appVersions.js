const logger = require(__dirname + '/../utils/winstonLogger');

let AppVersions = require(__dirname + '/../model/appVersions');

function getAppVersions(req, res, next) {
  AppVersions.find({}, function(error, apps) {
    if (error) {
      logger.error({
        'getAppVersions': error
      });
      res.json(err);
    } else {
      response = {
        //"token": refreshToken,
        "token": req['refreshToken'],
        "error": false,
        "message": apps,
      };
      res.json(response);
    }
  });
}

// Get single App Version
function getAppVersion(req, res, next) {
  AppVersions.findOne({
    _id: req.params.id
  }, function(error, app) {
    if (error) {
      logger.error({
        'getAppVersion': error
      });
      res.json(err);
    } else {
      res.json(app);
    }
  });
}

// Add New App Version
function addAppVersion(req, res, next) {
  let newUser = new AppVersions({
    appName: req.body.appName,
    lastVersion: req.body.lastVersion,
    defaultVersion: req.body.defaultVersion,
  });
  newUser.save((error, app) => {
    if (error) {
      logger.error({
        'addAppVersion': error
      });
      res.json(err);
    } else {
      res.json(app);
    }
  });
}

// Update App Version
function updateAppVersion(req, res, next) {
  const data = {
    // '_id': req.params.id,
    'appName': req.body.appName,
    'lastVersion': req.body.lastVersion,
    'defaultVersion': req.body.defaultVersion
  }
  Promise.all([setAppVersion(data)]).then(results => {
    if (results['error']) {
      logger.error({
        'updateAppVersion': error
      });
      res.json(error);
    } else {
      res.json(results);
    }
  });
}

function setAppVersion(data) {
  return new Promise(function(resolve, reject) {

    let dataObject = {};
    const entries = Object.entries(data);
    for (const [keys, value] of entries) {
      if (`${keys}` !== '_id') {
        dataObject[`${keys}`] = `${value}`;
      }
    }
    AppVersions.findOneAndUpdate({
        appName: data['appName']
      }, {
        $set: dataObject
      }, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      },
      function(error, result) {
        if (error) {
          logger.error({
            'updateAppVersion': error
          });
          resolve({
            'error': error
          });
        } else {
          resolve(result);
        }
      });
  });
}


// Delete App Version
function deleteAppVersion(req, res, next) {
  AppVersions.deleteOne({
    _id: req.params.id
  }, function(error, result) {
    if (error) {
      logger.error({
        'deleteAppVersion': error
      });
      res.json(err);
    } else {
      res.json(result);
    }
  });
}

module.exports = {
  getAppVersions,
  getAppVersion,
  addAppVersion,
  updateAppVersion,
  setAppVersion,
  deleteAppVersion
}
