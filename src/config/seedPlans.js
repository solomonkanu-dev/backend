import Plan from '../models/Plan.js';

// Two plans: a Free tier and one paid 'standard' plan.
// For 'standard', `price` is the per-student rate per term (NLe); the student
// cap comes from what the institute paid for (Institute.subscription.studentsPaidFor),
// so the `maxStudents` limit here is only a generous fallback.
const plans = [
  {
    name: 'free',
    displayName: 'Free',
    limits: { maxStudents: 40, maxLecturers: 5, maxClasses: 3, maxStorageMB: 100 },
    price: 0,
  },
  {
    name: 'standard',
    displayName: 'Standard',
    limits: { maxStudents: 100000, maxLecturers: 1000, maxClasses: 1000, maxStorageMB: 10000 },
    price: 100,
  },
];

const seedPlans = async () => {
  for (const plan of plans) {
    await Plan.updateOne({ name: plan.name }, plan, { upsert: true });
  }
  console.log('Plans seeded successfully');
};

export default seedPlans;
