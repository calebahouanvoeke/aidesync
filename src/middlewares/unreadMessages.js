const { query } = require('../config/database');

module.exports = async function unreadMessages(req, res, next) {
  if (!req.user || !req.user.id) {
    res.locals.unreadMessagesCount = 0;
    return next();
  }

  try {
    const result = await query(
      `SELECT COUNT(*) as count
       FROM messages
       WHERE prestataire_id = $1
         AND expediteur = 'client'
         AND lu = false`,
      [req.user.id]
    );
    res.locals.unreadMessagesCount = parseInt(result.rows[0]?.count || 0);
  } catch (err) {
    res.locals.unreadMessagesCount = 0;
  }

  next();
};