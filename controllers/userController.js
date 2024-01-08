const Employee = require("../models/userModel");
const jwt = require("jsonwebtoken");
const moment = require("moment-timezone");
const geolib = require("geolib");
const fs = require("fs");
const path = require("path");
const mime = require("mime-types");
const axios = require("axios");
const { ObjectId } = require("mongodb");
const { getLocation } = require("../middlewares/getLocation.Middleware");
const {
  uploadImageOnGoogleDrive,
} = require("../middlewares/googleDrive.middleware");
const { removeImage } = require("../middlewares/removeImage.middleware");
const moments = require("moment");

const officeLocation = {
  latitude: 28.6830441,
  longitude: 77.1347585,
};

function isAtOfficeLocation(employeeLocation) {
  const employeeLatitude = +employeeLocation.latitude;
  const employeeLongitude = +employeeLocation.longitude;
  const accuracyThreshold = 50000;
  const distance = geolib.getDistance(
    { latitude: employeeLatitude, longitude: employeeLongitude },
    officeLocation
  );
  console.log("distance", distance);
  return distance <= accuracyThreshold;
}

const filterNonNullData = (locationArray) => {
  const newArray = locationArray?.filter(
    (item) => item?.latitude != null && item?.longitude != null
  );
  return newArray;
};

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
    const image = req.file;
    const id = req.employee.employee._id;
    const { task, latitude, longitude } = req.body;
    const datetime = moment.tz(Date.now(), "Asia/Kolkata").format();
    if (!image) {
      // Removing Image From Server (it take call back function)
      await removeImage(image);

      return res
        .status(501)
        .send({ message: "Please Click Your Picture First!" });
    }

    if (!latitude || !longitude) {
      // Removing Image From Server (it take call back function)
      await removeImage(image);

      return res.status(501).send({ message: "Invalid coordinates" });
    }

    if (
      req.employee.employee.usertype !== "serviceengineer" &&
      !isAtOfficeLocation({ latitude, longitude })
    ) {
      // Removing Image From Server (it take call back function)
      await removeImage(image);

      // 50 meters in kilometers
      return res.status(501).send({
        message: "You Are Not In The Right Location.",
      });
    }

    const time = moment().format("DD-MM-YYYY h:mm A");
    const date = time.split(" ")[0];
    const loginTime = `${time.split(" ")[1]} ${time.split(" ")[2]}`;

    const employee = await Employee.findById({ _id: id });

    if (!employee) {
      // Removing Image From Server (it take call back function)
      await removeImage(image);

      return res.status(501).send({ message: "Employee Not Found" });
    }

    // Uploading Image on Drive
    const imgId = await uploadImageOnGoogleDrive(image);

    // Removing Image From Server (it take call back function)
    await removeImage(image);

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
    attendanceReport.workHours = `${hours}:${minutes}`;
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

      await employee.save();

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

    const employee = await Employee.findById(id)
      .select("attendance -_id")
      .exec();

    if (!employee) {
      return res.status(501).send({ message: "Employee Data Not Found" });
    }

    // Sort the "attendance" array in descending order based on the "login" date
    employee.attendance.sort((a, b) => new Date(b.login) - new Date(a.login));

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

    const time = moment().format("DD-MM-YYYY h:mm A");
    const checkInTimeOnly = `${time.split(" ")[1]} ${time.split(" ")[2]}`;

    const service = await Employee.findById(id).select("attendance");

    const length = service.attendance.length;

    const checkInService = service.attendance[length - 1];

    const addService = {
      checkIntime: datetime,
      checkInlocation: location,
      checkInlatitude: latitude,
      checkInlongitude: longitude,
      checkInTimeOnly: checkInTimeOnly,
      checkOutTimeOnly: "",
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
    const image1 = req.files["image1"][0];
    const image2 = req.files["image2"][0];

    // Uploading Image On Google Drive And Removing Image From Server (it take call back function)
    const imgId1 = await uploadImageOnGoogleDrive(image1);

    await removeImage(image1);

    const imgId2 = await uploadImageOnGoogleDrive(image2);

    // Removing Image From Server (it take call back function)
    await removeImage(image2);

    // Upload Second Image -------------------------------------------

    const {
      workDone,
      clientEmail,
      clientMobile,
      area,
      clientName,
      industryName,
    } = req.body;

    if (!id) {
      // Removing Image From Server (it take call back function)
      await removeImage(image1);
      await removeImage(image2);

      return res.status(501).send({ message: "Please Login First" });
    }

    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      // Removing Image From Server (it take call back function)
      await removeImage(image1);
      await removeImage(image2);

      return res
        .status(501)
        .send({ message: "We Can't Fetched Location, Please Try Again!!" });
    }

    const location = await getLocation(latitude, longitude);

    const datetime = moment.tz(Date.now(), "Asia/Kolkata").format();

    const time = moment().format("DD-MM-YYYY h:mm A");
    const CheckOutTimeOnly = `${time.split(" ")[1]} ${time.split(" ")[2]}`;

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
    serviceReport.checkOutTimeOnly = CheckOutTimeOnly;
    serviceReport.serviceAndInstrumentImage = `https://drive.google.com/uc?id=${imgId1}`;
    serviceReport.serviceReportImage = `https://drive.google.com/uc?id=${imgId2}`;
    serviceReport.serviceStatus = false;

    await attendances.save();

    res.status(200).json({
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

exports.getAttendanceDataController = async (req, res) => {
  try {
    const id = req.employee.employee._id;

    if (!id) {
      return res.status(501).send({ message: "Please Login First" });
    }

    const { attendanceId } = req.params;

    const attendance = await Employee.aggregate([
      {
        $match: {
          _id: new ObjectId(id), // Convert the employeeId to ObjectId type
        },
      },
      {
        $unwind: "$attendance",
      },
      {
        $match: {
          "attendance._id": new ObjectId(attendanceId), // Replace this with the actual attendance _id
        },
      },
      {
        $project: {
          attendance: 1,
          // "attendance.logoutTime": 1,
          // "attendance.locations": 1,
        },
      },
    ]);

    res.status(200).send({
      message: "Fetched Data",
      success: true,
      attendance,
    });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

// Mobile Version API
// Attendance Login
exports.loginAttendanceByPhoneController = async (req, res) => {
  try {
    const image = req.file;
    const { task, latitude, longitude, charge } = req.body;
    const { id } = req.params;

    // Check Is Image Uploaded
    if (!image) {
      // Removing Image From Server (it take call back function)
      await removeImage(image);

      return res
        .status(501)
        .send({ message: "Please Click Your Picture First!" });
    }

    if (!latitude || !longitude) {
      // Removing Image From Server (it take call back function)
      await removeImage(image);

      return res.status(501).send({ message: "Invalid coordinates" });
    }

    const employee = await Employee.findById({ _id: new ObjectId(id) });

    if (!employee) {
      // Removing Image From Server (it take call back function)
      await removeImage(image);

      return res.status(501).send({ message: "Employee Not Found" });
    }

    const datetime = moment.tz(Date.now(), "Asia/Kolkata").format();

    if (
      employee?.usertype !== "serviceengineer" &&
      !isAtOfficeLocation({ latitude, longitude })
    ) {
      // Removing Image From Server (it take call back function)
      await removeImage(image);

      // 50 meters in kilometers
      return res.status(501).send({
        message: "You Are Not In The Right Location.",
      });
    }

    const time = moment().format("DD-MM-YYYY h:mm A");
    const date = time.split(" ")[0];
    const loginTime = `${time.split(" ")[1]} ${time.split(" ")[2]}`;

    const imgId = await uploadImageOnGoogleDrive(image);

    // Removing Image From Server (it take call back function)
    await removeImage(image);

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
        charge: charge,
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

// Get Live Location
exports.getUserLiveCordinates = async (req, res) => {
  try {
    const { id } = req?.params;
    const { latitude, longitude, gpsStatus } = req.body;

    const time = moment().format("DD-MM-YYYY h:mm A");
    const IntervalTime = `${time.split(" ")[1]} ${time.split(" ")[2]}`;

    const employee = await Employee.findById({ _id: new ObjectId(id) });

    if (!employee) {
      return res.status(501).send({ message: "Employee Not Found" });
    }

    const leng = employee?.attendance.length;

    if (employee.attendance[leng - 1].attendanceStatus == true) {
      //  Getting Location Info By latitude and longitude by Open Cage APIs
      let locationName = await getLocation(latitude, longitude);

      const locationInfo = {
        latitude: latitude,
        longitude: longitude,
        locationName: locationName,
        time: IntervalTime,
        gpsStatus: gpsStatus ? "Active" : "Inactive",
      };

      employee.attendance.slice(-1)[0].locations.push(locationInfo);

      await employee.save();

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

// Attendance Logout
exports.logoutAttendanceByPhoneController = async (req, res) => {
  try {
    // const id = req.params;

    const { id, attendaceId } = req.params;

    const { taskReport, latitude, longitude, charge } = req.body;

    if (!latitude || !longitude) {
      return res.status(501).send({ message: "Invalid coordinates" });
    }

    const employee = await Employee.findById({ _id: new ObjectId(id) });

    if (!employee) {
      return res.status(501).send({ message: "Employee Not Found" });
    }

    if (
      employee?.usertype !== "serviceengineer" &&
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
    attendanceReport.workHours = `${hours}:${minutes}`;
    attendanceReport.logoutLocation.latitude = latitude;
    attendanceReport.logoutLocation.longitude = longitude;
    attendanceReport.logoutLocation.time = logoutTime;
    attendanceReport.logoutLocation.charge = charge;
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

// Get Latest Attendance
exports.latestAttendanceByPhoneController = async (req, res) => {
  try {
    const id = req.params;

    const employee = await Employee.findById({ _id: new ObjectId(id) });

    if (!employee) {
      return res.status(501).send({ message: "Employee Data Not Found" });
    }

    if (employee.attendance.length === 0) {
      return res.status(200).send({
        message: "Latest Attendance Status Updated",
        success: true,
        latestAttendance: {},
      });
    }

    const latestAttendance = employee.attendance.slice(-1)[0];

    res.status(200).send({
      message: "Latest Attendance Status Updated",
      success: true,
      latestAttendance,
    });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

// Service Check In
exports.serviceCheckInByPhoneController = async (req, res) => {
  try {
    const { id } = req.params;
    // const { attendanceId } = req.params;

    if (!id) {
      return res.status(501).send({ message: "Please Login First" });
    }

    const { latitude, longitude, checkInCharge } = req.body;
    console.log(latitude, longitude);

    if (!latitude || !longitude) {
      return res
        .status(501)
        .send({ message: "We Can't Fetched Location, Please Try Again!!" });
    }

    const time = moment().format("DD-MM-YYYY h:mm A");
    const checkInTimeOnly = `${time.split(" ")[1]} ${time.split(" ")[2]}`;

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
      checkInCharge: checkInCharge,
      checkInTimeOnly: checkInTimeOnly,
      checkOutTimeOnly: "",
      checkOutCharge: "",
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

// Service Check Out
exports.serviceCheckOutByPhoneController = async (req, res) => {
  try {
    const { id } = req.params;

    const image1 = req.files["image1"][0];
    const image2 = req.files["image2"][0];
    console.log("1", image1);
    console.log("2", image2);

    const {
      work,
      clientEmail,
      clientMobileNumber,
      serviceArea,
      clientName,
      industryName,
      latitude,
      longitude,
      checkOutCharge,
    } = req.body;

    if (!id) {
      // Removing Image From Server (it take call back function)
      await removeImage(image1);
      await removeImage(image2);

      return res.status(501).send({ message: "Please Login First" });
    }

    if (!latitude || !longitude) {
      // Removing Image From Server (it take call back function)
      await removeImage(image1);
      await removeImage(image2);

      return res
        .status(501)
        .send({ message: "We Can't Fetched Location, Please Try Again!!" });
    }

    const location = await getLocation(latitude, longitude);

    const datetime = moment.tz(Date.now(), "Asia/Kolkata").format();

    const time = moment().format("DD-MM-YYYY h:mm A");
    const CheckOutTimeOnly = `${time.split(" ")[1]} ${time.split(" ")[2]}`;

    // Uploading Image On Google Drive
    const imgId1 = await uploadImageOnGoogleDrive(image1);

    await removeImage(image1);

    const imgId2 = await uploadImageOnGoogleDrive(image2);

    await removeImage(image2);

    const attendances = await Employee.findById(id).select("attendance");

    const length = attendances.attendance.length;

    const Service = attendances.attendance[length - 1];

    const servicelength = Service.serviceDetails.length;

    const serviceReport = Service.serviceDetails[servicelength - 1];

    serviceReport.checkOuttime = datetime;
    serviceReport.checkOutCharge = checkOutCharge;
    serviceReport.checkOutlocation = location;
    serviceReport.checkOutlatitude = latitude;
    serviceReport.checkOutlongitude = longitude;
    serviceReport.industryName = industryName;
    serviceReport.clientName = clientName;
    serviceReport.area = serviceArea;
    serviceReport.clientMobile = clientMobileNumber;
    serviceReport.clientEmail = clientEmail;
    serviceReport.workDone = work;
    serviceReport.checkOutTimeOnly = CheckOutTimeOnly;
    serviceReport.serviceAndInstrumentImage = `https://drive.google.com/uc?id=${imgId1}`;
    serviceReport.serviceReportImage = `https://drive.google.com/uc?id=${imgId2}`;
    serviceReport.serviceStatus = false;

    await attendances.save();

    res.status(200).json({
      success: true,
      message: "Successfully Check Out From Service Work",
    });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

// get User Summarized Attendance Data
exports.getUserSummarizedAttendanceDataController = async (req, res) => {
  try {
    const { id, date } = req.params;

    if (!id) {
      return res.status(501).send({ message: "Please Login First" });
    }

    if (!date) {
      return res.status(501).send({ message: "Please First Select Any Date" });
    }

    const formattedDate = moment(date).format("DD-MM-YYYY");

    const attendanceData = await Employee.aggregate([
      {
        $unwind: "$attendance",
      },
      {
        $match: {
          _id: new ObjectId(id),
          "attendance.date": formattedDate,
        },
      },
      {
        $project: {
          attendance: "$attendance",
        },
      },
    ]);

    if (!attendanceData) {
      return res.status(501).send({ message: "No User Found With This Id" });
    }

    let FinalSortedLocationsList = [];
    const locationsArray = attendanceData[0]?.attendance?.locations;
    const FilterLocations = filterNonNullData(locationsArray);
    const length = FilterLocations?.length || 0;

    let distance1 = 0;

    if (
      attendanceData[0]?.attendance?.loginLocation?.latitude &&
      attendanceData[0]?.attendance?.loginLocation?.longitude &&
      FilterLocations.length > 0
    ) {
      distance1 = await geolib.getDistance(
        {
          latitude: attendanceData[0]?.attendance?.loginLocation?.latitude,
          longitude: attendanceData[0]?.attendance?.loginLocation?.longitude,
        },
        {
          latitude: FilterLocations[0]?.latitude,
          longitude: FilterLocations[0]?.longitude,
        }
      );
    }

    let totalDistance = 0;
    for (let i = 1; i < FilterLocations?.length - 2; i++) {
      if (FilterLocations.length > 0) {
        const distance = await geolib.getDistance(
          {
            latitude: FilterLocations[i]?.latitude,
            longitude: FilterLocations[i]?.longitude,
          },
          {
            latitude: FilterLocations[i + 1]?.latitude,
            longitude: FilterLocations[i + 1]?.longitude,
          }
        );
        totalDistance = totalDistance + distance;
      }
    }

    let distance2 = 0;
    if (
      attendanceData[0]?.attendance?.logoutLocation?.latitude &&
      attendanceData[0]?.attendance?.logoutLocation?.longitude &&
      FilterLocations.length > 0
    ) {
      distance2 = await geolib.getDistance(
        {
          latitude: FilterLocations[length - 1]?.latitude,
          longitude: FilterLocations[length - 1]?.longitude,
        },
        {
          latitude: attendanceData[0]?.attendance?.logoutLocation?.latitude,
          longitude: attendanceData[0]?.attendance?.logoutLocation?.longitude,
        }
      );
    }

    const TotalLocationDistanceCovered = distance1 + totalDistance + distance2;

    const totalDistanceInKilometer = TotalLocationDistanceCovered / 1000;

    res.status(200).json({
      success: true,
      message: "Successfully Get User Summarized Attendance Data",
      duration: attendanceData[0]?.attendance?.workHours,
      distance: totalDistanceInKilometer?.toFixed(2),
      checkIns: attendanceData[0]?.attendance?.serviceDetails?.length,
    });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

// Get User Login and Logout Attendance Info
exports.getUserLoginAndLogoutAttendanceInfoController = async (req, res) => {
  try {
    const { id, date } = req.params;

    if (!id) {
      return res.status(501).send({ message: "Please Login First" });
    }

    if (!date) {
      return res.status(501).send({ message: "Please First Select Any Date" });
    }

    const formattedDate = moment(date).format("DD-MM-YYYY");

    const attendanceData = await Employee.aggregate([
      {
        $unwind: "$attendance",
      },
      {
        $match: {
          _id: new ObjectId(id),
          "attendance.date": formattedDate,
        },
      },
      {
        $project: {
          attendance: "$attendance",
        },
      },
    ]);

    if (!attendanceData) {
      return res.status(501).send({ message: "No User Found With This Id" });
    }

    res.status(200).json({
      success: true,
      message: "Successfully Get User Login and Logout Attendance Data",
      LoginData: attendanceData[0]?.attendance?.loginLocation,
      LogoutData: attendanceData[0]?.attendance?.logoutLocation,
      task: attendanceData[0]?.attendance?.task,
      taskReport: attendanceData[0]?.attendance?.taskReport,
      loginImage: attendanceData[0]?.attendance?.loginImage,
      serviceDetails: attendanceData[0]?.attendance?.serviceDetails,
    });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

// Get User Waiting Time While He Stand One Place
exports.getUserWaitingAttendanceTimeController = async (req, res) => {
  try {
    const { id, date } = req.params;

    if (!id) {
      return res.status(501).send({ message: "Please Login First" });
    }

    if (!date) {
      return res.status(501).send({ message: "Please First Select Any Date" });
    }

    const formattedDate = moment(date).format("DD-MM-YYYY");

    const attendanceData = await Employee.aggregate([
      {
        $unwind: "$attendance",
      },
      {
        $match: {
          _id: new ObjectId(id),
          "attendance.date": formattedDate,
        },
      },
      {
        $project: {
          attendance: "$attendance",
        },
      },
    ]);

    if (!attendanceData) {
      return res.status(501).send({ message: "No User Found With This Id" });
    }

    const locations = attendanceData[0]?.attendance?.locations;
    const FilterLocations = filterNonNullData(locations);

    // Fetching User Waiting Time at One Place
    let resultOfWaitingTime = [];
    let currentSubarray = [];

    for (let i = 0; i < FilterLocations.length - 1; i++) {
      const distance = geolib.getDistance(
        {
          latitude: FilterLocations[i]?.latitude,
          longitude: FilterLocations[i]?.longitude,
        },
        {
          latitude: FilterLocations[i + 1]?.latitude,
          longitude: FilterLocations[i + 1]?.longitude,
        }
      );
      if (distance > 1000) {
        currentSubarray.push(FilterLocations[i]);
      } else if (currentSubarray.length > 0) {
        resultOfWaitingTime.push(currentSubarray);
        currentSubarray = [];
      }
    }

    const finalWaitingTimeArray = [];

    if (resultOfWaitingTime.length > 0) {
      // return res.send(resultOfWaitingTime);
      for (let i = 0; i < resultOfWaitingTime.length; i++) {
        // Calculating Working Hours
        const format = "hh:mm A";

        const startMoment = moment(resultOfWaitingTime[i][0].time, format);
        const endMoment = moment(
          resultOfWaitingTime[i][resultOfWaitingTime[i].length - 1].time,
          format
        );

        const duration = moment.duration(endMoment.diff(startMoment));

        const hours = Math.floor(duration.asHours());
        const minutes = Math.floor(duration.asMinutes()) % 60;

        const obj = {
          time: resultOfWaitingTime[i][0].time,
          location: resultOfWaitingTime[i][0].locationName,
          waitingTime: `${hours}:${minutes}`,
        };
        finalWaitingTimeArray.push(obj);
      }
    } else {
      finalWaitingTimeArray.push({
        time: attendanceData[0]?.attendance?.loginLocation?.time,
        location: attendanceData[0]?.attendance?.loginLocation?.locationName,
        waitingTime: attendanceData[0]?.attendance?.workHours,
      });
    }

    // Fetching User Location | GPS Status Change
    let resultOfGPSStatus = [];
    let currentSubarrayGPS = [];

    for (let i = 0; i < locations.length - 1; i++) {
      if (locations[i]?.gpsStatus == "Inactive") {
        currentSubarrayGPS.push(locations[i]);
      } else if (currentSubarrayGPS.length > 0) {
        resultOfGPSStatus.push(currentSubarrayGPS);
        currentSubarrayGPS = [];
      }
    }

    console.log(resultOfGPSStatus);

    let finalGPSStatusArray = [];

    if (resultOfGPSStatus.length > 0) {
      for (let i = 0; i < resultOfGPSStatus.length; i++) {
        // Calculating Working Hours
        const format = "hh:mm A";

        const startMoment = moment(resultOfGPSStatus[i][0].time, format);
        const endMoment = moment(
          resultOfGPSStatus[i][resultOfGPSStatus[i].length - 1].time,
          format
        );

        const duration = moment.duration(endMoment.diff(startMoment));

        const hours = Math.floor(duration.asHours());
        const minutes = Math.floor(duration.asMinutes()) % 60;

        const obj = {
          time: resultOfGPSStatus[i][0].time,
          location: resultOfGPSStatus[i][0].locationName,
          waitingTime: `${hours}:${minutes}`,
        };
        finalGPSStatusArray.push(obj);
      }
    } else {
      finalGPSStatusArray = [];
    }

    res.status(200).json({
      success: true,
      message: "Successfully Get User Login and Logout Attendance Data",
      finalWaitingTimeArray,
      finalGPSStatusArray,
    });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};

// Get User Waiting Time While Internet Off
exports.getUserInternetOnOffStatusController = async (req, res) => {
  try {
    const { id, date } = req.params;

    if (!id) {
      return res.status(501).send({ message: "Please Login First" });
    }

    if (!date) {
      return res.status(501).send({ message: "Please First Select Any Date" });
    }

    const formattedDate = moment(date).format("DD-MM-YYYY");

    const attendanceData = await Employee.aggregate([
      {
        $unwind: "$attendance",
      },
      {
        $match: {
          _id: new ObjectId(id),
          "attendance.date": formattedDate,
        },
      },
      {
        $project: {
          attendance: "$attendance",
        },
      },
    ]);

    if (!attendanceData) {
      return res.status(501).send({ message: "No User Found With This Id" });
    }

    const Internets = attendanceData[0]?.attendance?.internet;

    let InternetStatusArray = [];

    if (Internets.length > 0) {
      for (let i = 0; i < Internets.length; i++) {
        // Calculating Working Hours
        const format = "hh:mm A";

        const startMoment = moment(Internets[i].internetOffTime, format);
        const endMoment = moment(Internets[i].internetOnTime, format);

        const duration = moment.duration(endMoment.diff(startMoment));

        const hours = Math.floor(duration.asHours());
        const minutes = Math.floor(duration.asMinutes()) % 60;

        const obj = {
          time: Internets[i].internetOffTime,
          internetOffDuration: `${hours}:${minutes}`,
        };
        InternetStatusArray.push(obj);
      }
    } else {
      InternetStatusArray = [];
    }

    res.status(200).json({
      success: true,
      message: "Successfully Get User Internet Status Data",
      InternetStatusArray,
    });
  } catch (error) {
    res.status(500).send({ message: error.message, success: false });
  }
};
// Update User Internet Status
exports.updateUserInternetStatusController = async (req, res) => {
  try {
    const { id } = req.params;

    const { internetOffTime } = req.body;

    // Getting Current Time In 12:58 PM This Formate
    const time = moment().format("DD-MM-YYYY h:mm A");
    const IntervalTime = `${time.split(" ")[1]} ${time.split(" ")[2]}`;

    // Convert Milisecond Time In 12:58 PM This Formate
    const formattedTime = moment(internetOffTime * 1).format("hh:mm A");
    console.log(formattedTime);

    const employee = await Employee.findById({ _id: new ObjectId(id) });

    if (!employee) {
      return res.status(501).send({ message: "Employee Not Found" });
    }

    const leng = employee?.attendance.length;

    if (employee.attendance[leng - 1].attendanceStatus == true) {
      const internetStatusTime = {
        internetOffTime: formattedTime,
        internetOnTime: IntervalTime,
      };

      employee.attendance.slice(-1)[0].internet.push(internetStatusTime);

      await employee.save();

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
