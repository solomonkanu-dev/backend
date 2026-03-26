import mongoose from 'mongoose';
import logger from '../utils/logger.js';

/**
 * Drop stale indexes that have been superseded by schema changes.
 * Safe to run on every startup — silently ignores "index not found" errors.
 */
export async function migrateIndexes() {
  try {
    const db = mongoose.connection.db;

    // Drop the old attendance unique index that didn't include `subject`.
    // It was: { institute, class, date, type } — enforced one record per class
    // per day and blocked per-subject attendance. The new index is
    // { institute, class, subject, date, type }.
    try {
      await db.collection('attendances').dropIndex('institute_1_class_1_date_1_type_1');
      logger.info('Dropped stale attendance index: institute_1_class_1_date_1_type_1');
    } catch (err) {
      if (err.codeName !== 'IndexNotFound' && err.code !== 27) {
        logger.warn('Could not drop stale attendance index:', err.message);
      }
    }
  } catch (err) {
    logger.warn('migrateIndexes failed (non-fatal):', err.message);
  }
}
