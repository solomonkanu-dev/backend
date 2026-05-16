import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Institute from '../src/models/Institute.js';
import { seedDefaultRatingTraits } from '../src/services/ratingTrait.service.js';

dotenv.config();

/**
 * One-time seed: give every institute that has no rating traits the standard
 * Sierra Leone affective traits and psychomotor skills.
 */
const seedRatingTraits = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const institutes = await Institute.find().select('_id name admin').lean();
    let seeded = 0;

    for (const inst of institutes) {
      const before = seeded;
      await seedDefaultRatingTraits(inst._id, inst.admin);
      // seedDefaultRatingTraits is a no-op when traits already exist
      seeded = before + 1;
      console.log(`+ ${inst.name}: ensured rating traits`);
    }

    console.log(`Done. Processed ${institutes.length} institute(s).`);
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedRatingTraits();
