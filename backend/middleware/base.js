const jwt = require('jsonwebtoken');
const logger = require(__dirname + '/../utils/winstonLogger');
let User = require(__dirname + '/../model/user');

const {
  verifyAuth,
  verifyToken
} = require('../middleware/verifyToken');
//} = require('./verifyToken');


// register new user
function register(req, res, next) {

  let userData = req.body;
  logger.info({
    'register': {
      'user': userData['userID'],
      'isLocal': userData['isLocal'],
      'pswdReset': userData['pswdReset']
    }
  });
  User.findOne({
    userID: userData.userID
  }, (err, user) => {
    if (err) {
      res.status(401).send('401 Unauthorized!');
    } else {
      if (user && user.pswdReset !== true) {
        res.status(401).send('401 Unauthorized!');
      } else {
        verifyAuth(userData['userID'], userData['password'], userData['isLocal'], user, 'register').then(results => {
          logger.info({
            'register': {
              'results': results
            }
          });
          if (results['err'] === 1) {
            return res.status(401).send('401 Unauthorized!');
          } else if (results['err'] === 2) {
            return res.status(401).send(results['errMsg']);
          } else {
            User.countDocuments({}, function(error, totalCount) {
              if (error) {
                response = {
                  "error": true,
                  "message": "Sorry: an error occurred",
                }
                logger.error({
                  'register': {
                    'countDocuments': 'NA',
                    'results': error
                  }
                });
                res.status(400).send({
                  response
                });
              }
              if (totalCount <= 0) {
                userData.isActive = 'Active';
                userData.adminRole = 'Admin';
                userData.pswdReset = false;
              } else {
                userData.pswdReset = false;
              }

              User.findOneAndUpdate({
                  userID: userData['userID'],
                }, {
                  $set: userData,
                }, {
                  upsert: true,
                  new: true,
                  setDefaultsOnInsert: true,
                  select: '-password',
                },
                function(error, registeredUser) {
                  if (error) {
                    return res.status(401).send(error);
                  } else {
                    let payload = {
                      // subject: registeredUser._id
                      subject: userData['userID']
                    }
                    let token = jwt.sign(payload, 'secretKey');
                    logger.info({
                      'register(success)': {
                        'user': userData['userID'],
                        'isLocal': userData['isLocal'],
                      }
                    });
                    res.status(200).send({
                      registeredUser
                    });
                  }
                });
            });
          }
        });
      }
    }
  });
}

// update registered user password
function updateRegister(req, res, next) {
  User.findById(req.body._id, function(error, doc) {
    if (error) {
      logger.error({
        'updateRegister': {
          'user': req.body._id,
          'error': error
        }
      });
      res.json(err);
    } else {
      doc.password = req.body.password;
      doc.pswdReset = req.body.pswdReset;
      doc.save(); {
        let payload = {
          subject: req.body._id
        }
        let token = jwt.sign(payload, 'secretKey');
        logger.info({
          'updateRegister(success)': {
            'user': req.body._id,
          }
        });
        res.status(200).send({
          token
        })
      }
    }
  });
}

function updateToken(req, res, next) {

    response = {
      //"token": refreshToken,
      "token": req['refreshToken'],
      "error": false,
      "message": {
        "status": "token refreshed"
      },
    };
    logger.debug({
      'updateToken': 'refreshToken'
    });
    res.json(response);
}

module.exports = {
  register,
  updateRegister,
  updateToken,
}
