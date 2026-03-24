import { Schema, model } from 'mongoose';

const courseSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    institute: {
      type: Schema.Types.ObjectId,
      ref: 'Institute',
      required: true,
    },
    lecturers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    students: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Course = model('Course', courseSchema);

export default Course;
