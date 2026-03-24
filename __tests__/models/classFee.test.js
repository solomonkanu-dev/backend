import { describe, it, expect, beforeAll, afterAll, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import ClassFee from '../../src/models/ClassFee.js';
import Institute from '../../src/models/Institute.js';

describe('ClassFee Model', () => {
  let institute;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
    institute = await Institute.create({ name: 'CF Institute', address: '1', phoneNumber: '1', targetLine: 't', admin: new mongoose.Types.ObjectId() });
  });

  afterEach(async () => {
    await ClassFee.deleteMany({});
  });

  afterAll(async () => {
    await Institute.deleteMany({});
    await mongoose.disconnect();
  });

  it('creates a ClassFee document with required fields', async () => {
    const doc = await ClassFee.create({ institute: institute._id, class: new mongoose.Types.ObjectId(), fees: [{ fee: new mongoose.Types.ObjectId(), amount: 100 }], createdBy: new mongoose.Types.ObjectId() });
    expect(doc).toBeDefined();
    expect(doc.fees.length).toBe(1);
  });

  it('validation fails when required fields are missing', async () => {
    let err;
    try {
      await ClassFee.create({});
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
  });
});
