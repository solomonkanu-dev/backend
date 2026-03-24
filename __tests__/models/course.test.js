import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import Course from '../../src/models/Course.js';
import User from '../../src/models/user.js';
import Institute from '../../src/models/Institute.js';

describe('Course Model', () => {
  let institute;
  let lecturer1;
  let lecturer2;
  let student1;
  let student2;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    institute = await Institute.create({
      name: 'Test Institute',
      address: '123 Main St',
      phoneNumber: '1234567890',
      targetLine: 'Test',
      admin: new mongoose.Types.ObjectId(),
    });

    lecturer1 = await User.create({
      fullName: 'Course Lecturer 1',
      email: 'course.lecturer1@test.com',
      password: 'password123',
      role: 'lecturer',
      institute: institute._id,
      approved: true,
    });

    lecturer2 = await User.create({
      fullName: 'Course Lecturer 2',
      email: 'course.lecturer2@test.com',
      password: 'password123',
      role: 'lecturer',
      institute: institute._id,
      approved: true,
    });

    student1 = await User.create({
      fullName: 'Course Student 1',
      email: 'course.student1@test.com',
      password: 'password123',
      role: 'student',
      institute: institute._id,
      approved: true,
    });

    student2 = await User.create({
      fullName: 'Course Student 2',
      email: 'course.student2@test.com',
      password: 'password123',
      role: 'student',
      institute: institute._id,
      approved: true,
    });
  });

  afterAll(async () => {
    await Course.deleteMany({});
    await User.deleteMany({ email: /course\./ });
    await Institute.deleteMany({});
    await mongoose.disconnect();
  });

  describe('Create', () => {
    it('should create course with valid data', async () => {
      const course = await Course.create({
        name: 'JavaScript Basics',
        description: 'Learn JavaScript fundamentals',
        institute: institute._id,
      });

      expect(course).toBeDefined();
      expect(course._id).toBeDefined();
      expect(course.name).toBe('JavaScript Basics');
      expect(course.description).toBe('Learn JavaScript fundamentals');
      expect(course.lecturers).toEqual([]);
      expect(course.students).toEqual([]);
    });

    it('should create course with lecturers and students', async () => {
      const course = await Course.create({
        name: 'Advanced JavaScript',
        description: 'Advanced JS concepts',
        institute: institute._id,
        lecturers: [lecturer1._id, lecturer2._id],
        students: [student1._id, student2._id],
      });

      expect(course.lecturers).toHaveLength(2);
      expect(course.students).toHaveLength(2);
      expect(course.lecturers).toContainEqual(lecturer1._id);
      expect(course.lecturers).toContainEqual(lecturer2._id);
    });

    it('should fail to create course without name', async () => {
      await expect(
        Course.create({
          description: 'No name course',
          institute: institute._id,
        })
      ).rejects.toThrow();
    });

    it('should fail to create course without institute', async () => {
      await expect(
        Course.create({
          name: 'Test Course',
          description: 'No institute',
        })
      ).rejects.toThrow();
    });

    it('should trim name and description', async () => {
      const course = await Course.create({
        name: '  Course with spaces  ',
        description: '  Description with spaces  ',
        institute: institute._id,
      });

      expect(course.name).toBe('Course with spaces');
      expect(course.description).toBe('Description with spaces');
    });
  });

  describe('Read', () => {
    let course;

    beforeAll(async () => {
      course = await Course.create({
        name: 'Test Course',
        description: 'For reading',
        institute: institute._id,
        lecturers: [lecturer1._id],
        students: [student1._id],
      });
    });

    it('should find course by id', async () => {
      const found = await Course.findById(course._id);

      expect(found).toBeDefined();
      expect(found._id).toEqual(course._id);
      expect(found.name).toBe('Test Course');
    });

    it('should find course by name', async () => {
      const found = await Course.findOne({ name: 'Test Course' });

      expect(found).toBeDefined();
      expect(found.name).toBe('Test Course');
    });

    it('should populate lecturer references', async () => {
      const found = await Course.findById(course._id).populate('lecturers');

      expect(found.lecturers).toHaveLength(1);
      expect(found.lecturers[0].fullName).toBe('Course Lecturer 1');
    });

    it('should populate student references', async () => {
      const found = await Course.findById(course._id).populate('students');

      expect(found.students).toHaveLength(1);
      expect(found.students[0].fullName).toBe('Course Student 1');
    });

    it('should populate institute reference', async () => {
      const found = await Course.findById(course._id).populate('institute');

      expect(found.institute.name).toBe('Test Institute');
    });
  });

  describe('Update', () => {
    let course;

    beforeAll(async () => {
      course = await Course.create({
        name: 'Course to Update',
        description: 'Original description',
        institute: institute._id,
      });
    });

    it('should update course name and description', async () => {
      const updated = await Course.findByIdAndUpdate(
        course._id,
        {
          name: 'Updated Course Name',
          description: 'Updated description',
        },
        { new: true }
      );

      expect(updated.name).toBe('Updated Course Name');
      expect(updated.description).toBe('Updated description');
    });

    it('should add lecturer to course', async () => {
      const updated = await Course.findByIdAndUpdate(
        course._id,
        { $push: { lecturers: lecturer1._id } },
        { new: true }
      );

      expect(updated.lecturers).toContainEqual(lecturer1._id);
    });

    it('should add student to course', async () => {
      const updated = await Course.findByIdAndUpdate(
        course._id,
        { $push: { students: student2._id } },
        { new: true }
      );

      expect(updated.students).toContainEqual(student2._id);
    });

    it('should remove lecturer from course', async () => {
      await Course.findByIdAndUpdate(
        course._id,
        { $push: { lecturers: lecturer2._id } },
        { new: true }
      );

      const updated = await Course.findByIdAndUpdate(
        course._id,
        { $pull: { lecturers: lecturer2._id } },
        { new: true }
      );

      expect(updated.lecturers).not.toContainEqual(lecturer2._id);
    });
  });

  describe('Delete', () => {
    it('should delete course', async () => {
      const course = await Course.create({
        name: 'Course to Delete',
        institute: institute._id,
      });

      await Course.findByIdAndDelete(course._id);

      const found = await Course.findById(course._id);
      expect(found).toBeNull();
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt', async () => {
      const course = await Course.create({
        name: 'Timestamp Test Course',
        institute: institute._id,
      });

      expect(course.createdAt).toBeDefined();
      expect(course.updatedAt).toBeDefined();
      expect(course.createdAt).toEqual(course.updatedAt);
    });

    it('should update updatedAt on modification', async () => {
      const course = await Course.create({
        name: 'Original Name',
        institute: institute._id,
      });

      const originalTime = course.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      await Course.findByIdAndUpdate(course._id, { name: 'New Name' });
      const updated = await Course.findById(course._id);

      expect(updated.updatedAt.getTime()).toBeGreaterThan(
        originalTime.getTime()
      );
    });
  });
});
