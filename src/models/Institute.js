
import { Schema, model} from 'mongoose';

const instituteSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },

    address: {
        required: true,
      type: String,
    },

    website: {
        type: String,
        default: "",
    },

    country: {
        type: String,
        default: "",
    },

    email: {
        type: String,
        default: "",
    },

    phoneNumber: {
        required: true,
      type: String,
    },

    targetLine: {
        required: true,
        type: String,
    },

    logo: {
        type: String,
        default: "",
    },

    admin: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one institute per admin
    },
  },
  { timestamps: true }
);

export default model('Institute', instituteSchema);
