const Employee = require("../models/userModel");
const path = require("path");
const fs = require("fs");

const { google } = require("googleapis");
// Your Google Cloud Platform credentials file
const auth = require("../auth.json");

// Google Drive APIs Configuration
const drive = google.drive({
  version: "v3",
  auth: new google.auth.GoogleAuth({
    credentials: auth,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  }),
});

exports.userSignupController = async (req, res) => {
  try {
    // Access the uploaded image
    const image = req.file;
    console.log(image);

    const { password, email, username, first_name, profile } = req.body;

    if (!first_name || !username || !email || !password) {
      return res.status(501).send("Please Fill All Fields");
    }

    const existEmployee = await Employee.findOne({ email });

    if (existEmployee) {
      return res
        .status(501)
        .send({ message: "Employee Already Exist With This Email" });
    }

    let imgId;

    // Uploading Image on Drive
    if (req.file) {
      const response = await drive.files.create({
        requestBody: {
          name: req.file.originalname,
          mimeType: req.file.mimetype,
          // Get From Created Folder URL on Google Drive
          parents: ["1saKmG_cZnsWUBNiST6QtmVOvQnrgSD84"],
        },
        media: {
          body: fs.createReadStream(req.file.path),
        },
      });

      // Save additional data to your backend (you can modify this part as needed)
      const { data } = response;
      imgId = data.id;
      const imageData = {
        fileName: data.name,
        fileId: data.id,
        // Add more data fields if needed
      };

      // Removing Image From Server (it take call back function)
      fs.rm(`./uploads/${imageData.fileName}`, (err) => {
        if (!err) {
          console.log("File deleted successfully");
        } else {
          console.error(err);
        }
      });
    }

    // Creating New Employee
    let employee;

    if (req.file) {
      employee = new Employee({
        ...req.body,
        profile: `https://drive.google.com/uc?id=${imgId}`,
      });
    } else {
      employee = new Employee({
        ...req.body,
      });
    }

    await employee.save();

    if (!employee) {
      return res
        .status(501)
        .send({ message: "Employee Data Not Created, Please Try Again!" });
    }

    res
      .status(200)
      .send({ message: "Employee Data Created", employee, success: true });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

exports.userUpdateController = async (req, res) => {
  try {
    const { id } = req.params;

    let employee = await Employee.findByIdAndUpdate(
      { _id: id },
      {
        $set: req.body,
      },
      {
        runValidators: true,
      }
    );

    if (!employee) {
      return res.status(501).send({ message: "Employee Data Not Found" });
    }

    employee.password = undefined;

    res.status(200).send({
      message: "Employee Data Updated Successfully",
      employee,
      success: true,
    });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

exports.getUserByAdminController = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findById({ _id: id });

    if (!employee) {
      return res.status(501).send({ message: "Employee Data Not Found" });
    }

    res.status(200).send({
      message: "Employee Data Successfully Fetched",
      employee,
      success: true,
    });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

exports.getAllUserByAdminController = async (req, res) => {
  try {
    const employees = await Employee.find();

    if (!employees) {
      return res.status(501).send({ message: "Employees Data Not Found" });
    }

    res.status(200).send({
      message: "Fetched All Employee Successfully",
      employees,
      success: true,
    });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

exports.updateAttendanceController = async (req, res) => {
  try {
    const { userId } = req.params;
    const { attendanceId } = req.params;
    const {
      taskReport,
      workHours,
      task,
      attendanceStatus,
      logoutTime,
      loginTime,
      date,
      attendanceType,
    } = req.body;

    const employee = await Employee.findById({ _id: userId });

    if (!employee) {
      return res.status(501).send({ message: "Employee Not Found" });
    }

    const attendanceReport = employee.attendance.find(
      (record) => record._id.toString() === attendanceId.toString()
    );

    if (!attendanceReport) {
      return res.status(501).send({ message: "Attendance Record Not Found" });
    }

    attendanceReport.attendanceStatus =
      attendanceStatus || attendanceReport.attendanceStatus;
    attendanceReport.date = date || attendanceReport.date;
    attendanceReport.loginTime = loginTime || attendanceReport.loginTime;
    attendanceReport.logoutTime = logoutTime || attendanceReport.logoutTime;
    attendanceReport.task = task || attendanceReport.task;
    attendanceReport.taskReport = taskReport || attendanceReport.taskReport;
    attendanceReport.workHours = workHours || attendanceReport.workHours;
    attendanceReport.attendanceType =
      attendanceType || attendanceReport.attendanceType;

    await employee.save();

    res.status(200).send({
      message: "Attendance Record Updated Successfully",
      success: true,
    });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};
