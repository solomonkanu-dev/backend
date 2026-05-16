import { AppError } from '../errors/AppError.js';
import * as repo from '../repositories/ratingTrait.repository.js';
import mongoose from 'mongoose';

const DOMAINS = ['affective', 'psychomotor'];

/** Standard Sierra Leone affective traits and psychomotor skills. */
export const DEFAULT_RATING_TRAITS = {
  affective: [
    'Punctuality',
    'Attentiveness in class',
    'Honesty',
    'Politeness',
    'Neatness',
    'Cooperation',
    'Self-control',
    'Leadership',
    'Perseverance',
    'Respect for others',
  ],
  psychomotor: [
    'Handwriting',
    'Drawing & Painting',
    'Games & Sports',
    'Handling of tools',
    'Musical skills',
    'Crafts',
  ],
};

const getInstituteId = (user) => user.institute?._id || user.institute;

/** Seed the standard trait lists for an institute that has none. */
export const seedDefaultRatingTraits = async (instituteId, createdBy) => {
  const existing = await repo.countByInstitute(instituteId);
  if (existing > 0) return;
  const docs = [];
  for (const domain of DOMAINS) {
    DEFAULT_RATING_TRAITS[domain].forEach((name, i) => {
      docs.push({ institute: instituteId, domain, name, order: i, createdBy });
    });
  }
  await repo.insertMany(docs);
};

export const createTrait = async (body, user) => {
  const instituteId = getInstituteId(user);
  const { domain, name } = body;
  if (!DOMAINS.includes(domain)) throw new AppError('Invalid domain', 400);
  if (!name || !String(name).trim()) throw new AppError('Trait name is required', 400);

  const order = body.order ?? (await repo.findByInstitute(instituteId, domain)).length;
  return repo.create({
    institute: instituteId,
    domain,
    name: String(name).trim(),
    order,
    createdBy: user._id,
  });
};

export const getTraits = async (user, domain) => {
  if (domain && !DOMAINS.includes(domain)) throw new AppError('Invalid domain', 400);
  return repo.findByInstitute(getInstituteId(user), domain);
};

export const updateTrait = async (id, body, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid trait ID', 400);
  const trait = await repo.findById(id, getInstituteId(user));
  if (!trait) throw new AppError('Trait not found', 404);

  if (body.name !== undefined) {
    if (!String(body.name).trim()) throw new AppError('Trait name is required', 400);
    trait.name = String(body.name).trim();
  }
  if (body.order !== undefined) trait.order = body.order;

  return repo.save(trait);
};

export const deleteTrait = async (id, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid trait ID', 400);
  const trait = await repo.findById(id, getInstituteId(user));
  if (!trait) throw new AppError('Trait not found', 404);
  await repo.deleteOne(trait);
};
