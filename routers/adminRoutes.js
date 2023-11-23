const express = require("express");
const adminRouter = express.Router();

const {
  userSignupController,
  userUpdateController,
  getUserByAdminController,
  getAllUserByAdminController,
  updateAttendanceController,
} = require("../controllers/adminController");
const { isLoggedIn, isAuthorized } = require("../middlewares/auth.middleware");

adminRouter.post(
  "/signup",
  isLoggedIn,
  isAuthorized("admin"),
  userSignupController
);

adminRouter.get(
  "/getUser/:id",
  isLoggedIn,
  isAuthorized("admin"),
  getUserByAdminController
);

adminRouter.get(
  "/getAll/user",
  isLoggedIn,
  isAuthorized("admin"),
  getAllUserByAdminController
);

adminRouter.patch(
  "/updateUser/:id",
  isLoggedIn,
  isAuthorized("admin"),
  userUpdateController
);

adminRouter.patch(
  "/updateAttendance/:userId/:attendanceId",
  isLoggedIn,
  isAuthorized("admin"),
  updateAttendanceController
);

module.exports = adminRouter;
