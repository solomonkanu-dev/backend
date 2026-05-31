import mongoose from 'mongoose';
import * as repo from '../repositories/ruleBook.repository.js';
import { AppError } from '../errors/AppError.js';

const DEFAULT_SECTIONS = [
  {
    id: 'academic',
    title: 'Academic Rules',
    content:
      '1. Students must attend at least 75% of classes to be eligible for examinations.\n2. Assignments must be submitted by the specified due date. Late submissions will incur a penalty.\n3. Academic dishonesty including plagiarism and cheating is strictly prohibited.\n4. Students must maintain a minimum GPA of 2.0 to remain in good academic standing.\n5. All examination rules as communicated by the examinations office must be followed.',
    order: 0,
  },
  {
    id: 'conduct',
    title: 'Conduct & Discipline',
    content:
      '1. Students must treat all staff, lecturers, and fellow students with respect.\n2. Use of abusive language, bullying, or harassment of any kind will result in disciplinary action.\n3. Students are responsible for the upkeep of school property. Damage to property will be charged to the responsible student.\n4. Mobile phones must be on silent during class sessions unless explicitly permitted by the lecturer.\n5. Dress code must be adhered to at all times while on school premises.',
    order: 1,
  },
  {
    id: 'attendance',
    title: 'Attendance Policy',
    content:
      '1. Attendance is compulsory for all scheduled classes, lectures, and examinations.\n2. Absences must be reported to the class teacher or administration before the class, or within 24 hours of the absence.\n3. Medical absences must be supported by a valid medical certificate.\n4. Students with attendance below 75% in any subject will not be permitted to sit the final examination for that subject.\n5. Persistent truancy will result in suspension or expulsion.',
    order: 2,
  },
  {
    id: 'examination',
    title: 'Examination Rules',
    content:
      '1. Students must arrive at least 15 minutes before the scheduled examination time.\n2. No student will be admitted to the examination hall after 30 minutes from the start time.\n3. Electronic devices, notes, or any unauthorized materials are strictly prohibited in the examination hall.\n4. Students must present their valid student ID to enter the examination hall.\n5. Results will be released within 4 weeks of the examination date.',
    order: 3,
  },
  {
    id: 'fees',
    title: 'Fee Policy',
    content:
      '1. All school fees must be paid in full by the specified deadline each term.\n2. Students with outstanding fees may be suspended from classes until the balance is settled.\n3. Fee receipts must be kept and presented upon request.\n4. Requests for fee deferrals must be made in writing to the administration at least two weeks before the due date.\n5. Refund requests are subject to the school\'s refund policy as communicated at enrollment.',
    order: 4,
  },
];

const resolveInstituteId = (userInstitute) => {
  const id = userInstitute?._id ?? userInstitute;
  return mongoose.Types.ObjectId.isValid(id) ? id : null;
};

export const getDefaults = () => DEFAULT_SECTIONS.map((s) => ({ ...s }));

export const getRules = async (user) => {
  const instituteId = resolveInstituteId(user?.institute);
  if (!instituteId) throw new AppError('Institute ID is required', 400);

  const doc = await repo.findByInstitute(instituteId);
  if (doc && doc.sections?.length) {
    return { sections: doc.sections, isDefault: false, updatedAt: doc.updatedAt, updatedBy: doc.updatedBy };
  }
  return { sections: getDefaults(), isDefault: true, updatedAt: null, updatedBy: null };
};

export const updateRules = async (body, user) => {
  const instituteId = resolveInstituteId(user?.institute);
  if (!instituteId) throw new AppError('Institute ID is required', 400);

  const sections = Array.isArray(body?.sections) ? body.sections : null;
  if (!sections || sections.length === 0) throw new AppError('At least one section is required', 400);

  const cleaned = sections.map((s, idx) => {
    if (!s || typeof s !== 'object') throw new AppError('Invalid section payload', 400);
    const id = String(s.id || '').trim();
    const title = String(s.title || '').trim();
    if (!id) throw new AppError('Each section requires an id', 400);
    if (!title) throw new AppError('Each section requires a title', 400);
    return {
      id,
      title,
      content: typeof s.content === 'string' ? s.content : '',
      order: Number.isFinite(s.order) ? s.order : idx,
    };
  });

  const ids = new Set();
  for (const s of cleaned) {
    if (ids.has(s.id)) throw new AppError(`Duplicate section id: ${s.id}`, 400);
    ids.add(s.id);
  }

  const doc = await repo.upsertByInstitute(instituteId, {
    sections: cleaned,
    updatedBy: user?._id,
  });
  return { sections: doc.sections, isDefault: false, updatedAt: doc.updatedAt, updatedBy: doc.updatedBy };
};
