import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import FeeStructure from '../../src/models/FeeStructure.js';
import Institute from '../../src/models/Institute.js';

describe('FeeStructure Model', () => {
  let institute;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
    institute = await Institute.create({ name: 'FS Institute', address: '1', phoneNumber: '1', targetLine: 't', admin: new mongoose.Types.ObjectId() });
  });

  afterEach(async () => {
    await FeeStructure.deleteMany({});
  });

  afterAll(async () => {
    await Institute.deleteMany({});
    await mongoose.disconnect();
  });

  it('creates a fee structure with particulars and totalAmount', async () => {
    const f = await FeeStructure.create({ category: 'all', particulars: [{ label: 'A', amount: 10 }], totalAmount: 10, instituteId: institute._id });
    expect(f).toBeDefined();
    expect(f.totalAmount).toBe(10);
  });

  it('fails validation when particulars empty', async () => {
    let err;
    try {
      await FeeStructure.create({ category: 'all', particulars: [], totalAmount: 0, instituteId: institute._id });
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
  });
});
