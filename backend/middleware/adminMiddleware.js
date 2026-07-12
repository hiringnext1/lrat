function isAdmin(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ success: false, error: 'Access denied: Super Admin credentials required' });
  }
  next();
}

module.exports = isAdmin;
