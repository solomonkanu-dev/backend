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

    // Backfill assignments that were created before the status field was added.
    // They have status undefined/null — set them all to "published" so they remain visible.
    const assignmentResult = await db.collection('assignments').updateMany(
      { $or: [{ status: { $exists: false } }, { status: null }] },
      { $set: { status: 'published' } }
    );
    if (assignmentResult.modifiedCount > 0) {
      logger.info(`Backfilled status=published on ${assignmentResult.modifiedCount} assignment(s)`);
    }
  } catch (err) {
    logger.warn('migrateIndexes failed (non-fatal):', err.message);
  }
}
