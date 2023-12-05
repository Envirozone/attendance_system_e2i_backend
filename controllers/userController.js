const Employee = require("../models/userModel");
const jwt = require("jsonwebtoken");
const moment = require("moment-timezone");
const geolib = require("geolib");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

const { google } = require("googleapis");
// Your Google Cloud Platform credentials file
const auth = require("../auth.json");
const { getLocation } = require("../middlewares/getLocation.Middleware");

// Google Drive APIs Configuration
const drive = google.drive({
  version: "v3",
  auth: new google.auth.GoogleAuth({
    credentials: auth,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  }),
});

const officeLocation = {
  latitude: 28.6830441,
  longitude: 77.1347585,
};

function isAtOfficeLocation(employeeLocation) {
  const employeeLatitude = +employeeLocation.latitude;
  const employeeLongitude = +employeeLocation.longitude;
  const accuracyThreshold = 500000;
  const distance = geolib.getDistance(
    { latitude: employeeLatitude, longitude: employeeLongitude },
    officeLocation
  );
  console.log("distance", distance);
  return distance <= accuracyThreshold;
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

    const payload = {
      _id: employee._id,
      first_name: employee.first_name,
      last_name: employee.last_name,
      username: employee.username,
      email: employee.email,
      phone: employee.phone,
      profile: employee.profile,
      usertype: employee.usertype,
      salary: employee.salary,
      hireDate: employee.hireDate,
      department: employee.department,
      skills: employee.skills,
      position: employee.position,
      address: employee.address,
      city: employee.city,
      state: employee.state,
    };

    // Generate the JWT
    const token = jwt.sign({ employee: payload }, process.env.JWT_SECRET_KEY, {
      expiresIn: "365d",
    });

    employee.password = undefined;

    // Set the token in a cookie
    res.cookie("token", token, {
      httpOnly: true,
      // secure: true,
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    res.status(200).send({
      message: "SuccessFully Login",
      token,
      success: true,
      employee: payload,
    });
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
    const id = req.employee.employee._id;

    if (!id) {
      return res.status(501).send({ message: "Employee Id Not Found" });
    }

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

exports.updateUserController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(501).send({ message: "Employee Id Not Found" });
    }

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

exports.updateUserProfileController = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(501).send({ message: "Employee Id Not Found" });
    }

    let employee = await Employee.findById({ _id: id });

    if (!employee) {
      return res.status(501).send({ message: "Employee Data Not Found" });
    }

    const profileImage = req.file;

    if (!profileImage) {
      return res
        .status(501)
        .send({ message: "Please Select Your Picture First!" });
    }

    // Uploading Image on Drive
    let imgId;

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

    employee.profile = `https://drive.google.com/uc?id=${imgId}`;

    employee.save();

    res.status(200).send({
      message: "Employee Profile Image Updated Successfully",
      success: true,
    });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

exports.loginAttendanceController = async (req, res) => {
  try {
    // Access the uploaded image
    const loginImage = req.file;
    const id = req.employee.employee._id;
    const { task, latitude, longitude } = req.body;
    const datetime = moment.tz(Date.now(), "Asia/Kolkata").format();
    if (!loginImage) {
      // Removing Image From Server (it take call back function)
      fs.rm(`./uploads/${req.file.originalname}`, (err) => {
        if (!err) {
          console.log("File deleted successfully");
        } else {
          console.error(err);
        }
      });

      return res
        .status(501)
        .send({ message: "Please Click Your Picture First!" });
    }

    if (!latitude || !longitude) {
      // Removing Image From Server (it take call back function)
      fs.rm(`./uploads/${req.file.originalname}`, (err) => {
        if (!err) {
          console.log("File deleted successfully");
        } else {
          console.error(err);
        }
      });

      return res.status(501).send({ message: "Invalid coordinates" });
    }

    if (
      req.employee.employee.usertype !== "serviceengineer" &&
      !isAtOfficeLocation({ latitude, longitude })
    ) {
      // Removing Image From Server (it take call back function)
      fs.rm(`./uploads/${req.file.originalname}`, (err) => {
        if (!err) {
          console.log("File deleted successfully");
        } else {
          console.error(err);
        }
      });

      // 50 meters in kilometers
      return res.status(501).send({
        message: "You Are Not In The Right Location.",
      });
    }

    // if (!isAtOfficeLocation({ latitude, longitude })) {
    //   // Removing Image From Server (it take call back function)
    //   fs.rm(`./uploads/${req.file.originalname}`, (err) => {
    //     if (!err) {
    //       console.log("File deleted successfully");
    //     } else {
    //       console.error(err);
    //     }
    //   });

    //   // 50 meters in kilometers
    //   return res.status(501).send({
    //     message: "You Are Not In The Right Location.",
    //   });
    // }

    const time = moment().format("DD-MM-YYYY h:mm A");
    const date = time.split(" ")[0];
    const loginTime = `${time.split(" ")[1]} ${time.split(" ")[2]}`;

    const employee = await Employee.findById({ _id: id });

    if (!employee) {
      // Removing Image From Server (it take call back function)
      fs.rm(`./uploads/${req.file.originalname}`, (err) => {
        if (!err) {
          console.log("File deleted successfully");
        } else {
          console.error(err);
        }
      });

      return res.status(501).send({ message: "Employee Not Found" });
    }

    // Uploading Image on Drive
    let imgId;

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
    fs.rm(`./uploads/${req.file.originalname}`, (err) => {
      if (!err) {
        console.log("File deleted successfully");
      } else {
        console.error(err);
      }
    });

    //  Getting Location Info By latitude and longitude by Open Cage APIs
    const locationName = await getLocation(latitude, longitude);

    const attandance = {
      date,
      login: datetime,
      logout: "",
      loginTime,
      loginImage: `https://drive.google.com/uc?id=${imgId}`,
      task,
      attendanceStatus: true,
      taskReport: "",
      workHours: "",
      logoutTime: "",
      attendanceType: "updateonlogout",
      loginLocation: {
        latitude: latitude,
        longitude: longitude,
        locationName: locationName,
        time: loginTime,
      },
    };

    await employee.attendance.push(attandance);

    await employee.save();

    res.status(200).send({
      message: "You Login Successfully, With Right Location!",
      attandance,
      success: true,
    });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

exports.logoutAttendanceController = async (req, res) => {
  try {
    const id = req.employee.employee._id;

    const { attendaceId } = req.params;

    const { taskReport, latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(501).send({ message: "Invalid coordinates" });
    }

    if (
      req.employee.employee.usertype !== "serviceengineer" &&
      !isAtOfficeLocation({ latitude, longitude })
    ) {
      // 50 meters in kilometers
      return res.status(501).send({
        message: "You Are Not In The Right Location.",
      });
    }

    // 50 meters in kilometers
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
    const datetime = moment.tz(Date.now(), "Asia/Kolkata").format();

    if (!startMoment.isValid() || !endMoment.isValid()) {
      return "Invalid Time Format!!";
    }

    const duration = moment.duration(endMoment.diff(startMoment));

    const hours = Math.floor(duration.asHours());
    const minutes = Math.floor(duration.asMinutes()) % 60;

    //  Getting Location Info By latitude and longitude by Open Cage APIs
    let locationName = await getLocation(latitude, longitude);

    attendanceReport.logout = datetime;
    attendanceReport.attendanceStatus = false;
    attendanceReport.logoutTime = logoutTime;
    attendanceReport.taskReport = taskReport;
    attendanceReport.workHours = `${hours}:${minutes} Hours`;
    attendanceReport.logoutLocation.latitude = latitude;
    attendanceReport.logoutLocation.longitude = longitude;
    attendanceReport.logoutLocation.time = logoutTime;
    attendanceReport.logoutLocation.locationName = locationName;
    if (hours >= 7) {
      attendanceReport.attendanceType = "fullday";
    } else if (hours >= 4) {
      attendanceReport.attendanceType = "shortday";
    } else {
      attendanceReport.attendanceType = "halfday";
    }

    await employee.save();

    res
      .status(200)
      .send({ message: "You Logout Successfully, With Correct Location!" });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

exports.latestAttendanceController = async (req, res) => {
  try {
    const id = req.employee.employee._id;

    const employee = await Employee.findById({ _id: id });

    if (employee.attendance.length === 0) {
      return res.status(200).send({
        message: "Latest Attendance Status Updated",
        success: true,
        latestAttendance: {},
      });
    }

    const latestAttendance = employee.attendance.slice(-1)[0];

    if (!employee) {
      return res.status(501).send({ message: "Employee Data Not Found" });
    }

    res.status(200).send({
      message: "Latest Attendance Status Updated",
      success: true,
      latestAttendance,
    });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

exports.getUserCordinatesOnInterval = async (req, res) => {
  try {
    const id = req?.employee?.employee?._id;
    const { latitude, longitude } = req.body;

    const time = moment().format("DD-MM-YYYY h:mm A");
    const IntervalTime = `${time.split(" ")[1]} ${time.split(" ")[2]}`;

    if (!latitude || !longitude) {
      return res
        .status(501)
        .send({ message: "Employee Denied Access Location" });
    }

    const employee = await Employee.findById({ _id: id });

    if (!employee) {
      return res.status(501).send({ message: "Employee Not Found" });
    }

    const leng = employee?.attendance.length;
    console.log(leng);

    if (employee.attendance[leng - 1].attendanceStatus == true) {
      //  Getting Location Info By latitude and longitude by Open Cage APIs
      let locationName = await getLocation(latitude, longitude);

      const locationInfo = {
        latitude: latitude,
        longitude: longitude,
        locationName: locationName,
        time: IntervalTime,
      };

      employee.attendance.slice(-1)[0].locations.push(locationInfo);

      employee.save();

      res.status(200).send({
        message: "Location Fetched On Interval",
        success: true,
      });
    } else {
      return res.status(501).send({ message: "Employee Logout" });
    }
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

exports.getAttendanceByDateController = async (req, res) => {
  try {
    const id = req.employee.employee._id;

    const { date } = req.params;
    console.log(date);

    // Parse the input date using moment
    const parsedDate = moment(date, "YYYY-MM-DD");
    console.log(parsedDate);

    // Format the date in the "dd-mm-yyyy" format
    const formattedDate = parsedDate.format("DD-MM-YYYY");
    console.log(formattedDate);

    // const employee = await Employee.find({
    //   _id: id,
    //   "attendance.date": formattedDate,
    // });

    const employee = await Employee.findOne({
      _id: id,
    });

    const attendance = employee.attendance
      .filter((item) => item.date === formattedDate)
      .sort();

    console.log(attendance);

    res.status(200).send({
      message: `${formattedDate} Attendance Info Fetched`,
      success: true,
      attendance,
    });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

exports.getUserAttendanceController = async (req, res) => {
  try {
    const id = req.employee.employee._id;
    const { page } = req.params;
    const limit = 5;

    if (!id) {
      return res.status(501).send({ message: "Employee Id Not Found" });
    }

    const employee = await Employee.findById(id).select("attendance -_id");

    if (!employee) {
      return res.status(501).send({ message: "Employee Data Not Found" });
    }

    const attendance = employee?.attendance;

    const attendances = attendance.slice(page * limit, page * limit + limit);
    const employeeDetails = req.employee.employee;
    employeeDetails.attendance = attendances;

    res.status(200).send({
      message: "Employee Data Successfully Fetched",
      employeeDetails,
      count: employee.attendance.length,
      success: true,
    });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

exports.serviceCheckInController = async (req, res) => {
  try {
    const id = req.employee.employee._id;
    // const { attendanceId } = req.params;

    if (!id) {
      return res.status(501).send({ message: "Please Login First" });
    }

    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res
        .status(501)
        .send({ message: "We Can't Fetched Location, Please Try Again!!" });
    }

    const location = await getLocation(latitude, longitude);

    const datetime = moment.tz(Date.now(), "Asia/Kolkata").format();

    const service = await Employee.findById(id).select("attendance");

    const length = service.attendance.length;

    const checkInService = service.attendance[length - 1];

    const addService = {
      checkIntime: datetime,
      checkInlocation: location,
      checkInlatitude: latitude,
      checkInlongitude: longitude,
      checkOuttime: "",
      checkOutlocation: "",
      checkOutlatitude: "",
      checkOutlongitude: "",
      industryName: "",
      clientName: "",
      area: "",
      time: "",
      date: "",
      clientMobile: "",
      clientEmail: "",
      workDone: "",
      serviceAndInstrumentImage: "",
      serviceReportImage: "",
      serviceStatus: true,
    };

    await checkInService.serviceDetails.push(addService);

    await service.save();

    res.status(200).send({
      success: true,
      message: "Successfully Check In For Service",
    });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

exports.serviceCheckOutController = async (req, res) => {
  try {
    const id = req.employee.employee._id;
    // const { attendanceId, serviceId } = req.params;

    const {
      serviceReportImage,
      serviceAndInstrumentImage,
      workDone,
      clientEmail,
      clientMobile,
      area,
      clientName,
      industryName,
    } = req.body;

    if (!id) {
      return res.status(501).send({ message: "Please Login First" });
    }

    // if (!attendanceId || !serviceId) {
    //   return res.status(501).send({ message: "Wrong ID" });
    // }

    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res
        .status(501)
        .send({ message: "We Can't Fetched Location, Please Try Again!!" });
    }

    const location = await getLocation(latitude, longitude);

    const datetime = moment.tz(Date.now(), "Asia/Kolkata").format();

    const attendances = await Employee.findById(id).select("attendance");

    const length = attendances.attendance.length;

    const Service = attendances.attendance[length - 1];

    const servicelength = Service.serviceDetails.length;

    const serviceReport = Service.serviceDetails[servicelength - 1];

    serviceReport.checkOuttime = datetime;
    serviceReport.checkOutlocation = location;
    serviceReport.checkOutlatitude = latitude;
    serviceReport.checkOutlongitude = longitude;
    serviceReport.industryName = industryName;
    serviceReport.clientName = clientName;
    serviceReport.area = area;
    serviceReport.clientMobile = clientMobile;
    serviceReport.clientEmail = clientEmail;
    serviceReport.workDone = workDone;
    serviceReport.serviceAndInstrumentImage = serviceAndInstrumentImage;
    serviceReport.serviceReportImage = serviceReportImage;
    serviceReport.serviceStatus = false;

    await attendances.save();

    res.status(200).send({
      success: true,
      message: "Successfully Check Out From Service Work",
    });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

exports.getLatestServiceReportController = async (req, res) => {
  try {
    const id = req.employee.employee._id;

    if (!id) {
      return res.status(501).send({ message: "Please Login First" });
    }

    const attendances = await Employee.findById(id).select("attendance");

    const length = attendances.attendance.length;

    const Service = attendances.attendance[length - 1];

    const servicelength = Service.serviceDetails.length;

    if (servicelength === 0) {
      return res.status(200).send({
        success: true,
        message: "Successfully Fetched Latest Service Details",
        serviceDetail: { serviceStatus: false },
      });
    }

    const serviceDetail = Service.serviceDetails[servicelength - 1];

    res.status(200).send({
      success: true,
      message: "Successfully Fetched Latest Service Details",
      serviceDetail,
    });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};
