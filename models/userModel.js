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
      enum: ["client", "serviceengineer", "admin"],
      default: "client",
    },
    salary: {
      type: Number,
    },
    hireDate: {
      type: String,
    },
    department: {
      type: String,
      enum: ["service", "managment", "developer"],
      default: "developer",
    },
    skills: {
      type: String,
    },
    position: {
      type: String,
    },
    address: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    attendance: [
      {
        date: {
          type: String,
        },
        loginTime: {
          type: String,
        },
        loginImage: {
          type: String,
        },
        logoutTime: {
          type: String,
        },
        attendanceStatus: {
          type: Boolean,
        },
        attendanceType: {
          type: String,
          enum: ["halfday", "fullday", "shortday", "updateonlogout"],
          default: "updateonlogout",
        },
        task: {
          type: String,
        },
        workHours: {
          type: String,
        },
        taskReport: {
          type: String,
        },
        loginLocation: {
          latitude: {
            type: Number,
          },
          longitude: {
            type: Number,
          },
          locationName: {
            type: String,
          },
        },
        logoutLocation: {
          latitude: {
            type: Number,
          },
          longitude: {
            type: Number,
          },
          locationName: {
            type: String,
          },
        },
        locations: [
          {
            latitude: {
              type: Number,
            },
            longitude: {
              type: Number,
            },
            locationName: {
              type: String,
            },
          },
        ],
      },
      {
        timestamps: true,
      },
    ],
  },
  { timestamps: true }
);

const Employee = mongoose.model("employees", employeeSchema);
module.exports = Employee;
