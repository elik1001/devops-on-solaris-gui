const router = require('express').Router();

const {
  verifyToken
} = require('../middleware/verifyToken');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/users');

// get all users
router.get('/', verifyToken(['Admin']), getUsers);

// get single user by userid
router.get('/:userID', getUser);

// create new user
router.post('/', verifyToken(['Admin']), createUser);

// update user data
router.put('/:id', verifyToken(['Admin']), updateUser);

// create new user
router.delete('/:id', verifyToken(['Admin']), deleteUser);

module.exports = router;
