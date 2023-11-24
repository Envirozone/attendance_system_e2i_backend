const Employee = require("../models/userModel");
const jwt = require("jsonwebtoken");
const moment = require("moment");

const targetLocation = {
  latitude: 28.6818304,
  longitude: 77.185024,
};

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in kilometers

  return distance;
}

exports.userLoginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(501).send({ message: "Please Fill All Fields" });
    }

    const employee = await Employee.findOne({ email });

    if (!employee) {
      return res
        .status(501)
        .send({ message: "Employee With This Email Not Found" });
    }

    const matchedPassword = password === employee.password;

    if (!matchedPassword) {
      return res
        .status(501)
        .send({ message: "Password Not Matched, Please Try Again" });
    }

    // Generate the JWT
    const token = jwt.sign({ employee }, process.env.JWT_SECRET_KEY, {
      expiresIn: "365d",
    });

    employee.password = undefined;

    // Set the token in a cookie
    res.cookie("token", token, {
      httpOnly: true,
      // secure: true,
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    res
      .status(200)
      .send({ message: "SuccessFully Login", token, employee, success: true });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

exports.userLogoutController = async (req, res) => {
  try {
    res.clearCookie("token");
    res.status(200).send({ message: "SuccessFully Logout" });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

exports.getUserController = async (req, res) => {
  try {
    const employee = req.employee;

    if (!employee) {
      return res.status(501).send({ message: "Employee Not Found" });
    }

    res
      .status(200)
      .send({ message: "Employee Data Successfully Fetched", employee });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

exports.loginAttendanceController = async (req, res) => {
  try {
    const id = req.employee.employee._id;
    const { task, latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(501).send({ message: "Invalid coordinates" });
    }

    const distance = calculateDistance(
      latitude,
      longitude,
      targetLocation.latitude,
      targetLocation.longitude
    );

    if (distance <= 0.05) {
      // 50 meters in kilometers
      const time = moment().format("DD-MM-YYYY h:mm A");
      const date = time.split(" ")[0];
      const loginTime = `${time.split(" ")[1]} ${time.split(" ")[2]}`;

      const employee = await Employee.findById({ _id: id });

      if (!employee) {
        return res.status(501).send({ message: "Employee Not Found" });
      }

      const attandance = {
        date,
        loginTime,
        task,
        attendanceStatus: true,
        taskReport: "",
        workHours: "",
        logoutTime: "",
      };

      await employee.attendance.push(attandance);

      await employee.save();

      res.status(200).send({
        message: "You Login Successfully, With Right Location!",
        attandance,
        success: true,
      });
    } else {
      return res.status(501).send({
        message: "You Are Not In The Right Location.",
      });
    }
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

exports.logoutAttendanceController = async (req, res) => {
  try {
    const id = req.employee.employee._id;

    const { attendaceId } = req.params;

    const { taskReport } = req.body;

    const time = moment().format("DD-MM-YYYY h:mm A");
    const logoutTime = `${time.split(" ")[1]} ${time.split(" ")[2]}`;

    const employee = await Employee.findById({ _id: id });

    if (!employee) {
      return res.status(501).send({ message: "Employee Not Found" });
    }

    const attendanceReport = employee.attendance.find(
      (record) => record._id.toString() === attendaceId.toString()
    );

    if (!attendanceReport) {
      return res
        .status(501)
        .send({ message: "You Are Not Login, First Login!!" });
    }

    // Calculating Working Hours
    const format = "hh:mm A";

    const startMoment = moment(attendanceReport.loginTime, format);
    const endMoment = moment(logoutTime, format);

    if (!startMoment.isValid() || !endMoment.isValid()) {
      return "Invalid Time Format!!";
    }

    const duration = moment.duration(endMoment.diff(startMoment));

    const hours = Math.floor(duration.asHours());
    const minutes = Math.floor(duration.asMinutes()) % 60;

    attendanceReport.attendanceStatus = false;
    attendanceReport.logoutTime = logoutTime;
    attendanceReport.taskReport = taskReport;
    attendanceReport.workHours = `${hours}:${minutes} Hours`;

    await employee.save();

    res.status(200).send({ message: "You Logout Successfully" });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};
