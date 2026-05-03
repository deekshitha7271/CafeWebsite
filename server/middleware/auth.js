const User = require('../models/User');

const protect = async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId).select('-password');
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      req.user = user;
      return next();
    } catch (error) {
      return res.status(500).json({ error: 'Server error' });
    }
  }
  res.status(401).json({ error: 'Not authorized, please log in' });
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `User role ${req.user?.role} is not authorized to access this route` });
    }
    next();
  };
};

module.exports = { protect, authorize };
