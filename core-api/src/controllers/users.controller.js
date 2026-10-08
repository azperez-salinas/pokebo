const notImplemented = (req, res) => res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'TODO' });

module.exports = {
  getMe: notImplemented,
  updateMyLocation: notImplemented,
};
