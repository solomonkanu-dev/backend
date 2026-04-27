import Plan from '../models/Plan.js';

const plans = [
  {
    name: 'free',
    displayName: 'Free',
    limits: { maxStudents: 40, maxLecturers: 5, maxClasses: 3, maxStorageMB: 100 },
    price: 0,
  },
  {
    name: 'basic',
    displayName: 'Basic',
    limits: { maxStudents: 500, maxLecturers: 10, maxClasses: 10, maxStorageMB: 500 },
    price: 1,
  },
  {
    name: 'pro',
    displayName: 'Pro',
    limits: { maxStudents: 500, maxLecturers: 50, maxClasses: 20, maxStorageMB: 5000 },
    price: 1,
  },
];

const seedPlans = async () => {
  for (const plan of plans) {
    await Plan.updateOne({ name: plan.name }, plan, { upsert: true });
  }
  console.log('Plans seeded successfully');
};

export default seedPlans;
