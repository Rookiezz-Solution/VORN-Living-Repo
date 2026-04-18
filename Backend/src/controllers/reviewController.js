const reviewModel = require('../models/reviewModel');

const recent = async (req, res) => {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit || '10', 10)));
    const reviews = await reviewModel.getRecentVerifiedReviews(limit);
    return res.json({ reviews });
  } catch (e) {
    console.error('Reviews recent error:', e);
    return res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { recent };

