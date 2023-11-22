const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      required: [true, "First Name Is Required"],
      trim: true,
    },
    last_name: {
      type: String,
      trim: true,
    },
    username: {
      type: String,
      required: [true, "UserName Is Required"],
      trim: true,
      unique: true,
    },
    email: {
      type: String,
      required: [true, "Email Is Required"],
      trim: true,
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Password Is Required"],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    profile: {
      type: String,
    },
    usertype: {
      type: String,
      enum: ["client", "admin"],
      default: "client",
    },
    salary: {
      type: Number,
    },
    hireDate: {
      type: Date,
    },
    department: {
      type: String,
      enum: ["service", "managment", "developer"],
      default: "developer",
    },
    skills: {
      type: [String],
    },
    position: {
      type: String,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
    },
    attendance: [
      {
        date: {
          type: Date,
        },
        loginTime: {
          type: Date,
        },
        logoutTime: {
          type: Date,
        },
        attendanceStatus: {
          type: String,
        },
        task: {
          type: String,
        },
        workHours: {
          type: Number,
        },
        taskReport: {
          type: String,
        },
      },
    ],
  },
  { timestamps: true }
);

const Employee = mongoose.model("employees", employeeSchema);
module.exports = Employee;
