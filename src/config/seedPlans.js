import Plan from '../models/Plan.js';

const plans = [
  {
    name: 'free',
    displayName: 'Free',
    limits: { maxStudents: 50, maxLecturers: 5, maxClasses: 3, maxStorageMB: 100 },
    price: 0,
  },
  {
    name: 'basic',
    displayName: 'Basic',
    limits: { maxStudents: 200, maxLecturers: 20, maxClasses: 15, maxStorageMB: 500 },
    price: 29,
  },
  {
    name: 'pro',
    displayName: 'Pro',
    limits: { maxStudents: 1000, maxLecturers: 100, maxClasses: 100, maxStorageMB: 5000 },
    price: 99,
  },
];

const seedPlans = async () => {
  for (const plan of plans) {
    await Plan.updateOne({ name: plan.name }, plan, { upsert: true });
  }
  console.log('Plans seeded successfully');
};

export default seedPlans;
