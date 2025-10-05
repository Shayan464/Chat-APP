import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URL);
    console.log("mongo db connection successfull ✅", conn.connection.host);
  } catch (error) {
    console.log("mongo db connection failed❌", error);
  }
};

export default connectDB;
