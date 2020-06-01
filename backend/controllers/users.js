const logger = require(__dirname + '/../utils/winstonLogger');

let User = require(__dirname + '/../model/user');

// get all users
function getUsers(req, res, next) {
  User.find({}, '-password', function(error, users) {
    if (error) {
      logger.error({
        'getUsers': error
      });
      res.json(err);
    } else {
      response = {
        "token": req['refreshToken'],
        "error": false,
        "message": users,
      };
      res.json(response);
    }
  });
}

// get single user
function getUser(req, res, next) {
  User.findOne({
    userID: req.params.userID
  }, '-password', function(error, user) {
    if (error) {
      logger.error({
        'getUser': error
      });
      res.json(err);
    } else {
      if (req.body.register) {
        if (user && user['pswdReset'] === 'true') {
          res.json(user);
        } else {
          return res.status(401).send('401 Unauthorized!');
        }
      } else {
        res.json(user);
      }
    }
  });
}

// create new user
function createUser(req, res, next) {
  let newUser = new User({
    userID: req.body.userID,
    adminRole: req.body.adminRole,
    isLocal: req.body.isLocal,
    isActive: req.body.isActive,
    pswdReset: req.body.pswdReset,
  });
  newUser.save((error, user) => {
    if (error) {
      logger.error({
        'createUser': error
      });
      res.json(err);
    } else {
      res.json(user);
    }
  });
}

// update a user
function updateUser(req, res, next) {
  User.findOneAndUpdate({
      _id: req.params.id
    }, {
      $set: {
        userID: req.body.userID,
        adminRole: req.body.adminRole,
        isLocal: req.body.isLocal,
        isActive: req.body.isActive,
        pswdReset: req.body.pswdReset,
      },
    }, {
      new: true
    },
    function(error, result) {
      if (error) {
        logger.error({
          'updateUser': error
        });
        res.json(error);
      } else {
        res.json(result);
      }
    });
}

// delete registered user
function deleteUser(req, res, next) {
  User.deleteOne({
    _id: req.params.id
  }, function(error, result) {
    if (error) {
      logger.error({
        'deleteUser': error
      });
      res.json(err);
    } else {
      res.json(result);
    }
  });
}

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser
}
