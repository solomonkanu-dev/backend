import mongoose from "mongoose";

const ratingTraitSchema = new mongoose.Schema(
  {
    institute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
    },
    domain: {
      type: String,
      enum: ["affective", "psychomotor"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

ratingTraitSchema.index({ institute: 1, domain: 1, name: 1 }, { unique: true });
ratingTraitSchema.index({ institute: 1, domain: 1 });

export default mongoose.model("RatingTrait", ratingTraitSchema);
