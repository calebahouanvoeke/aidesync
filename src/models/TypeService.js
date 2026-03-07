const { pool, query } = require('../config/database');

class TypeService {
  
  static async findAll() {
    try {
      const result = await query(
        'SELECT * FROM types_service WHERE actif = true ORDER BY nom'
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    try {
      const result = await query('SELECT * FROM types_service WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = TypeService;