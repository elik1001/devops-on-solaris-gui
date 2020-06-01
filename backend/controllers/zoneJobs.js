const logger = require(__dirname + '/../utils/winstonLogger');

let ZoneJobs = require(__dirname + '/../model/zoneJobs');

const {
  agenda4
} = require('../jobs/autoDualZones');

function getZoneJobs(req, res, next) {
  ZoneJobs.find({}, function(error, apps) {
    if (error) {
      logger.error({
        'getZoneJobs': error
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

// Update Job
function updateZoneJobs(req, res, next) {

  const data = {
    '_id': req.body._id,
  }
  Promise.all([setZoneJobs(data)]).then(results => {

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

function setZoneJobs(data) {
  return new Promise(function(resolve, reject) {    

    ZoneJobs.findOneAndUpdate({
        _id: data['_id']
      }, {
        $unset: {
          lockedAt : 1,
          lastRunAt: 1,
          //failCount: 1,
          //failReason: 1,
          //failedAt: 1,
          lastFinishedAt: 1
        },
        $set: {
          nextRunAt: new Date(Date.now()).toISOString()
        },
      }, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      },
      function(error, result) {
        if (error) {
          logger.error({
            'setZoneJobs': error
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
function deleteZoneJobs(req, res, next) {
  ZoneJobs.deleteOne({
    _id: req.params.id
  }, function(error, result) {
    if (error) {
      logger.error({
        'deleteZoneJobs': error
      });
      res.json(err);
    } else {
      res.json(result);
    }
  });
}


module.exports = {
  getZoneJobs,
  updateZoneJobs,
  deleteZoneJobs
}
