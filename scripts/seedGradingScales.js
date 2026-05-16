import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Institute from '../src/models/Institute.js';
import GradingScale from '../src/models/GradingScale.js';
import { SIERRA_LEONE_GRADE_SCALE } from '../src/services/grading.service.js';

dotenv.config();

/**
 * One-time seed: give every institute that has no default grading scale the
 * Sierra Leone standard scale, so it is visible and editable in Settings.
 */
const seedGradingScales = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const institutes = await Institute.find().select('_id name admin').lean();
    let created = 0;

    for (const inst of institutes) {
      const existing = await GradingScale.findOne({ institute: inst._id, isDefault: true });
      if (existing) {
        console.log(`- ${inst.name}: already has a default scale, skipped`);
        continue;
      }
      await GradingScale.create({
        institute: inst._id,
        name: 'Sierra Leone Standard',
        grades: SIERRA_LEONE_GRADE_SCALE,
        isDefault: true,
        createdBy: inst.admin,
      });
      created += 1;
      console.log(`+ ${inst.name}: seeded Sierra Leone Standard scale`);
    }

    console.log(`Done. Seeded ${created} of ${institutes.length} institute(s).`);
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedGradingScales();
