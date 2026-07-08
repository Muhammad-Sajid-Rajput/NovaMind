// NovaMind — backend/models/User.js

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254
    },
    passwordHash: {
      type: String,
      required: true
    },
    name: {
      type: String,
      trim: true,
      maxlength: 80
    },
    // Email verification
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    emailOtp: {
      type: String,
      default: null
    },
    emailOtpExpiry: {
      type: Date,
      default: null
    },
    // Password reset
    resetOtp: {
      type: String,
      default: null
    },
    resetOtpExpiry: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("passwordHash")) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
});

// Compare plain password against hash
userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// Generate a 6-digit OTP, hash it, and set expiry (15 minutes)
userSchema.methods.generateOtp = async function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.emailOtp = await bcrypt.hash(otp, 10);
  this.emailOtpExpiry = new Date(Date.now() + 15 * 60 * 1000);
  return otp; // return plaintext to send in email
};

// Verify OTP — returns true if valid and not expired
userSchema.methods.verifyOtp = async function (code) {
  if (!this.emailOtp || !this.emailOtpExpiry) return false;
  if (new Date() > this.emailOtpExpiry) return false;
  return bcrypt.compare(code, this.emailOtp);
};

// Generate a 6-digit OTP for password reset, hash it, and set expiry (15 minutes)
userSchema.methods.generateResetOtp = async function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.resetOtp = await bcrypt.hash(otp, 10);
  this.resetOtpExpiry = new Date(Date.now() + 15 * 60 * 1000);
  return otp; // return plaintext to send in email
};

// Verify reset OTP — returns true if valid and not expired
userSchema.methods.verifyResetOtp = async function (code) {
  if (!this.resetOtp || !this.resetOtpExpiry) return false;
  if (new Date() > this.resetOtpExpiry) return false;
  return bcrypt.compare(code, this.resetOtp);
};

// Never expose passwordHash / OTP fields in JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.emailOtp;
  delete obj.emailOtpExpiry;
  delete obj.resetOtp;
  delete obj.resetOtpExpiry;
  return obj;
};

const User = mongoose.model("User", userSchema);
export default User;
