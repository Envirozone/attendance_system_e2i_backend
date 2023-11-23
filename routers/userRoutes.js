const express = require("express");

const {
  userLoginController,
  userLogoutController,
  getUserController,
  loginAttendanceController,
  logoutAttendanceController,
  getLocationController,
} = require("../controllers/userController");

const { isLoggedIn } = require("../middlewares/auth.middleware");
const userRouter = express.Router();

userRouter.post("/login", userLoginController);
userRouter.get("/logout", userLogoutController);
userRouter.get("/getUser", isLoggedIn, getUserController);
userRouter.post("/attendanceLogin", isLoggedIn, loginAttendanceController);
userRouter.patch(
  "/attendanceLogout/:attendaceId",
  isLoggedIn,
  logoutAttendanceController
);

// userRouter.get("/getLocation", getLocationController);

module.exports = userRouter;
