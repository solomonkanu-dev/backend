import { AppError } from '../errors/AppError.js';
import * as assignmentRepo from '../repositories/assignment.repository.js';
import { sendEmailNotification } from '../utils/email.js';
import { sendSmsNotification } from '../utils/sms.js';
import { notify } from '../utils/notify.js';

// ─── Private: fire-and-forget notifications to students & parents ─────────────

async function notifyAssignmentByEmail(assignment, requestingUser) {
  try {
    const { default: Institute } = await import('../models/Institute.js');

    const instituteId = requestingUser.institute?._id || requestingUser.institute;
    if (!instituteId) return;

    const institute = await Institute.findById(instituteId).select('name').lean();
    const instituteName = institute?.name ?? 'Institution';

    const subject = await assignmentRepo.findSubjectById(assignment.subject);
    const subjectName = subject?.name ?? 'Unknown Subject';

    const dueDateStr = assignment.dueDate
      ? new Date(assignment.dueDate).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : 'No due date';

    const students = await assignmentRepo.findStudentsByClass(assignment.class, instituteId);

    const notifData = {
      title: assignment.title,
      subject: subjectName,
      dueDate: dueDateStr,
      totalMarks: assignment.totalMarks ?? 100,
    };

    const relatedEntity = { entityType: 'Assignment', entityId: assignment._id };

    await Promise.allSettled(
      students.flatMap((s) => {
        const meta = { instituteId, type: 'assignmentPosted', recipientId: s._id, instituteName, data: notifData };
        return [
          sendEmailNotification({ ...meta, recipientEmail: s.email }),
          sendSmsNotification({ ...meta, recipientPhone: s.studentProfile?.mobileNumber }),
          notify({
            recipientId: s._id,
            instituteId,
            type: 'assignment_created',
            title: 'New assignment',
            message: `New ${subjectName} assignment "${assignment.title}" — due ${dueDateStr}.`,
            relatedEntity,
          }),
        ];
      })
    );

    // Alert linked parents — in-app notification + email/SMS
    const studentIds = students.map((s) => s._id);
    if (studentIds.length > 0) {
      const studentNameById = new Map(students.map((s) => [String(s._id), s.fullName]));
      const parents = await assignmentRepo.findParentsByStudentIds(studentIds, instituteId);

      await Promise.allSettled(
        parents.flatMap((p) => {
          const childName =
            (p.linkedStudents ?? [])
              .map((id) => studentNameById.get(String(id)))
              .find(Boolean) ?? 'your child';
          const meta = {
            instituteId,
            type: 'assignmentPosted',
            recipientId: p._id,
            instituteName,
            data: { ...notifData, childName },
          };
          return [
            sendEmailNotification({ ...meta, recipientEmail: p.email }),
            sendSmsNotification({ ...meta, recipientPhone: p.phoneNumber }),
            notify({
              recipientId: p._id,
              instituteId,
              type: 'assignment_created',
              title: 'New assignment for your child',
              message: `${childName} has a new ${subjectName} assignment: "${assignment.title}" — due ${dueDateStr}.`,
              relatedEntity,
            }),
          ];
        })
      );
    }
  } catch {
    // fire-and-forget — never throws
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const createAssignment = async (body, user) => {
  if (!['lecturer', 'admin'].includes(user.role)) {
    throw new AppError('Access denied', 403);
  }

  const { title, description, subjectId, dueDate, totalMarks, status, attachmentUrl, attachmentName } = body;

  const subjectQuery = { _id: subjectId, institute: user.institute };
  if (user.role === 'lecturer') subjectQuery.lecturer = user._id;

  const { default: Subject } = await import('../models/Subject.js');
  const subject = await Subject.findOne(subjectQuery);
  if (!subject) throw new AppError('Subject not found or unauthorized', 404);

  const assignment = await assignmentRepo.create({
    title,
    description,
    subject: subjectId,
    class: subject.class,
    lecturer: user._id,
    institute: user.institute,
    dueDate,
    totalMarks: totalMarks ?? 100,
    status: status ?? 'published',
    attachmentUrl: attachmentUrl ?? '',
    attachmentName: attachmentName ?? '',
  });

  // Fire-and-forget
  notifyAssignmentByEmail(assignment, user).catch(() => {});

  return assignment;
};

export const getAssignmentsBySubject = async (subjectId, user) => {
  const extra = user.role === 'student' ? { status: 'published' } : {};
  return assignmentRepo.findBySubject(subjectId, user.institute, extra);
};

export const getAssignmentsByClass = async (classId, user) => {
  const extra = user.role === 'student' ? { status: 'published' } : {};
  return assignmentRepo.findByClass(classId, user.institute, extra);
};

export const getMyAssignments = async (user) => {
  if (user.role !== 'lecturer') throw new AppError('Access denied', 403);
  return assignmentRepo.findByLecturer(user._id, user.institute);
};

export const getAssignmentById = async (id, user) => {
  const assignment = await assignmentRepo.findOne({ _id: id, institute: user.institute });
  if (!assignment) throw new AppError('Assignment not found', 404);

  if (user.role === 'student' && assignment.status !== 'published') {
    throw new AppError('Assignment not found', 404);
  }

  return assignment;
};

export const updateAssignment = async (id, body, user) => {
  if (!['lecturer', 'admin'].includes(user.role)) {
    throw new AppError('Access denied', 403);
  }

  const assignment = await assignmentRepo.findOne({ _id: id, institute: user.institute });
  if (!assignment) throw new AppError('Assignment not found', 404);

  if (user.role === 'lecturer' && String(assignment.lecturer) !== String(user._id)) {
    throw new AppError('Access denied', 403);
  }

  const { title, description, dueDate, totalMarks, status, attachmentUrl, attachmentName } = body;
  if (title !== undefined) assignment.title = title;
  if (description !== undefined) assignment.description = description;
  if (dueDate !== undefined) assignment.dueDate = dueDate;
  if (totalMarks !== undefined) assignment.totalMarks = totalMarks;
  if (status !== undefined) assignment.status = status;
  if (attachmentUrl !== undefined) assignment.attachmentUrl = attachmentUrl;
  if (attachmentName !== undefined) assignment.attachmentName = attachmentName;

  return assignmentRepo.save(assignment);
};

export const deleteAssignment = async (id, user) => {
  if (!['lecturer', 'admin'].includes(user.role)) {
    throw new AppError('Access denied', 403);
  }

  const assignment = await assignmentRepo.findOne({ _id: id, institute: user.institute });
  if (!assignment) throw new AppError('Assignment not found', 404);

  if (user.role === 'lecturer' && String(assignment.lecturer) !== String(user._id)) {
    throw new AppError('Access denied', 403);
  }

  return assignmentRepo.deleteOne(assignment);
};
