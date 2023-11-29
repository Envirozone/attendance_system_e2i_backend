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
} = require("../controllers/userController");

const { isLoggedIn } = require("../middlewares/auth.middleware");
const { upload } = require("../middlewares/multer.middleware");
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

module.exports = userRouter;
