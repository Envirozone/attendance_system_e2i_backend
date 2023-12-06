const express = require("express");

const {
  userLoginController,
  userLogoutController,
  getUserController,
  loginAttendanceController,
  logoutAttendanceController,
  latestAttendanceController,
  updateUserController,
  updateUserProfileController,
  getUserCordinatesOnInterval,
  getAttendanceByDateController,
  getUserAttendanceController,
  serviceCheckInController,
  serviceCheckOutController,
  getLatestServiceReportController,
  getAttendanceDataController,
} = require("../controllers/userController");

const { isLoggedIn } = require("../middlewares/auth.middleware");
const { upload, uploads } = require("../middlewares/multer.middleware");
// const { uploads } = require("../middlewares/multer.middleware");
const userRouter = express.Router();

userRouter.post("/login", userLoginController);
userRouter.get("/logout", userLogoutController);
userRouter.get("/getUser", isLoggedIn, getUserController);
userRouter.patch("/updateUser/:id", isLoggedIn, updateUserController);
userRouter.patch(
  "/updateUserProfileImage/:id",
  isLoggedIn,
  upload.single("profile"),
  updateUserProfileController
);
userRouter.post(
  "/attendanceLogin",
  isLoggedIn,
  upload.single("loginImage"),
  loginAttendanceController
);
userRouter.patch(
  "/attendanceLogout/:attendaceId",
  isLoggedIn,
  logoutAttendanceController
);
userRouter.get("/latestAttendance", isLoggedIn, latestAttendanceController);

userRouter.post(
  "/getUserCordinatesOnInterval",
  isLoggedIn,
  getUserCordinatesOnInterval
);

userRouter.get(
  "/getAttendanceByDate/:date",
  isLoggedIn,
  getAttendanceByDateController
);

userRouter.get(
  "/getUserAttendance/:page",
  isLoggedIn,
  getUserAttendanceController
);

userRouter.post("/service/checkin", isLoggedIn, serviceCheckInController);

userRouter.post(
  "/service/checkout",
  isLoggedIn,
  uploads,
  serviceCheckOutController
);

userRouter.get("/latest/service", isLoggedIn, getLatestServiceReportController);

userRouter.get("/get/attendanceData/:attendanceId", isLoggedIn, getAttendanceDataController)

module.exports = userRouter;
