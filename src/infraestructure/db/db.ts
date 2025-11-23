import mongoose from 'mongoose';
import { config } from 'dotenv';

export const connectDB = async () => {
  const dbUrl = config().parsed?.DATABASE_URL;

  if (!dbUrl) {
    console.error('❌ DATABASE_URL is not defined in the environment variables');
    process.exit(1);
  }

  try {
    await mongoose.connect(dbUrl);
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};
