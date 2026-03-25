import mongoose from 'mongoose';

const systemConfigSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'global' },
    maintenanceMode: {
      global: {
        enabled:   { type: Boolean, default: false },
        message:   { type: String, default: 'System is under maintenance. Please try again later.' },
        enabledAt: { type: Date },
        enabledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
      institutes: [
        {
          institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute' },
          enabled:   { type: Boolean, default: false },
          message:   { type: String },
          enabledAt: { type: Date },
          enabledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        },
      ],
    },
  },
  { timestamps: true }
);

export default mongoose.model('SystemConfig', systemConfigSchema);
