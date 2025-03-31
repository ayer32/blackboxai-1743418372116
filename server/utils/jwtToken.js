const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// Generate and send token response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = generateToken(user._id);

  const options = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  // Add secure flag in production
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  // Remove password from response
  user.password = undefined;

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user
    });
};

// Verify token
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return {
      valid: true,
      expired: false,
      decoded
    };
  } catch (error) {
    return {
      valid: false,
      expired: error.name === 'TokenExpiredError',
      decoded: null
    };
  }
};

// Generate refresh token
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
  });
};

// Verify refresh token
const verifyRefreshToken = (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    return {
      valid: true,
      expired: false,
      decoded
    };
  } catch (error) {
    return {
      valid: false,
      expired: error.name === 'TokenExpiredError',
      decoded: null
    };
  }
};

// Generate reset password token
const generateResetToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_RESET_SECRET, {
    expiresIn: '1h'
  });
};

// Verify reset password token
const verifyResetToken = (resetToken) => {
  try {
    const decoded = jwt.verify(resetToken, process.env.JWT_RESET_SECRET);
    return {
      valid: true,
      expired: false,
      decoded
    };
  } catch (error) {
    return {
      valid: false,
      expired: error.name === 'TokenExpiredError',
      decoded: null
    };
  }
};

// Token management for multiple devices
const generateDeviceToken = (userId, deviceId) => {
  return jwt.sign(
    { 
      userId,
      deviceId
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '30d'
    }
  );
};

// Blacklist management for logged out tokens
const tokenBlacklist = new Set();

const addToBlacklist = (token) => {
  tokenBlacklist.add(token);
};

const isBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

// Clean up expired tokens from blacklist periodically
const cleanupBlacklist = () => {
  tokenBlacklist.forEach(token => {
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        tokenBlacklist.delete(token);
      }
    }
  });
};

// Run cleanup every hour
setInterval(cleanupBlacklist, 60 * 60 * 1000);

module.exports = {
  generateToken,
  sendTokenResponse,
  verifyToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateResetToken,
  verifyResetToken,
  generateDeviceToken,
  addToBlacklist,
  isBlacklisted
};