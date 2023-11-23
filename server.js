const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const cors = require("cors");

// Connecting Server With DB
const { connectionToDB } = require("./config/db");

// Importing Routes
const userRouter = require("./routers/userRoutes");
const adminRouter = require("./routers/adminRoutes");

// Configure ENV File
require("dotenv").config();

// Calling Express Instance
const app = express();

// Setup Port Number
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Making Routes
app.use("/api/vi/user", userRouter);
app.use("/api/vi/admin", adminRouter);

// Start Server
app.listen(PORT, async () => {
  try {
    await connectionToDB;
    console.log("DB Connected");
    console.log(`Server is running on http://localhost:${PORT}`);
  } catch (error) {
    console.log(error.message);
  }
});
