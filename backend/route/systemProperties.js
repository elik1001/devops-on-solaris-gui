const router = require('express').Router();

const {
  getSystemProps,
  getSystemProp,
  updateSystemProp,
  deleteSystemProp
} = require('../middleware/systemProperties');
const {
  verifyToken
} = require('../middleware/verifyToken');

// get all system prop
router.get('/', verifyToken(['Admin', 'Zone-Admin']), getSystemProps);

// get single system prop
//router.get('/:prop', getSystemProp);

// update system prop data
router.put('/:prop', verifyToken(['Admin', 'Zone-Admin']), updateSystemProp);

// delete system prop
router.delete('/:prop', verifyToken(['Admin', 'Zone-Admin']), deleteSystemProp);

module.exports = router;
