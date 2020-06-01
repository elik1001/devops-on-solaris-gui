const router = require('express').Router();

const {
  register,
  updateRegister,
  updateToken
} = require('../middleware/base');
const {
  getToken,
  verifyToken
} = require('../middleware/verifyToken');

// register new user
router.post('/register', register);

// update registered user password
router.post('/register/:id', updateRegister);

// login
router.post('/login', getToken);

// update token
router.post('/updateToken', verifyToken(['Admin', 'Zone-Admin', 'Zone-Users', 'Zone-Guests']), updateToken);

module.exports = router;
