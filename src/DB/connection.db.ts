import { connect } from "mongoose";
import { DB_URI } from "../config/config";

const connectDB = async () => {
  try {
    await connect(DB_URI, { serverSelectionTimeoutMS: 30000 });
    console.log("db connected");
  } catch (error) {
    console.log("failed to  connect db", error);
  }
};
export default connectDB;
