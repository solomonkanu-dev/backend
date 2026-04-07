import SystemConfig from '../models/SystemConfig.js';

export const findGlobal = () => SystemConfig.findOne({ key: 'global' });

export const upsertGlobal = (update) =>
  SystemConfig.findOneAndUpdate(
    { key: 'global' },
    { $set: update },
    { upsert: true, new: true }
  );

export const ensureGlobalExists = () =>
  SystemConfig.findOneAndUpdate(
    { key: 'global' },
    { $setOnInsert: { key: 'global' } },
    { upsert: true, new: true }
  );

export const pullInstituteEntry = (instituteId) =>
  SystemConfig.updateOne(
    { key: 'global' },
    { $pull: { 'maintenanceMode.institutes': { institute: instituteId } } }
  );

export const pushInstituteEntry = (entry) =>
  SystemConfig.updateOne(
    { key: 'global' },
    { $push: { 'maintenanceMode.institutes': entry } }
  );
