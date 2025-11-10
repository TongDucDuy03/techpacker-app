import { Schema, Document, model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export enum UserRole {
  Designer = 'designer',
  Merchandiser = 'merchandiser',
  Admin = 'admin',
  Viewer = 'viewer',
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: UserRole;
  customerId?: string;
  isActive: boolean;
  lastLogin: Date;
  refreshTokens: string[];
  fullName: string;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.Designer },
    customerId: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    refreshTokens: [{ type: String }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Hash password before saving
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Virtual property for fullName
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Method to compare password for login
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(password, this.password);
};

// Indexes for performance
// Note: `email` field already has `unique: true` which creates an index.
// Avoid declaring a duplicate index here to prevent Mongoose warnings.
UserSchema.index({ role: 1, isActive: 1 }); // Common filter pattern
UserSchema.index({ isActive: 1 }); // Active users filter

const User = model<IUser>('User', UserSchema);

export default User;
