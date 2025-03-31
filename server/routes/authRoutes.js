const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  deleteMe
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { userValidation, validate } = require('../utils/validator');
const { authLimiter } = require('../middleware/error');

// Apply rate limiting to auth routes
router.use(authLimiter);

// Public routes
router.post('/register', userValidation.register, validate, register);
router.post('/login', userValidation.login, validate, login);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

// Protected routes
router.use(protect); // All routes below this will be protected

router.get('/me', getMe);
router.put('/updatedetails', userValidation.register, validate, updateDetails);
router.put('/updatepassword', updatePassword);
router.post('/logout', logout);
router.delete('/deleteme', deleteMe);

module.exports = router;