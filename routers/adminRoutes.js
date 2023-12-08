const express = require("express");
const adminRouter = express.Router();

const {
  userSignupController,
  userUpdateController,
  getUserByAdminController,
  getAllUserByAdminController,
  updateAttendanceController,
  latestAttendanceByIdController,
  getAttendanceDataByDateController,
} = require("../controllers/adminController");
const { isLoggedIn, isAuthorized } = require("../middlewares/auth.middleware");
const { upload } = require("../middlewares/multer.middleware");

adminRouter.post(
  "/signup",
  isLoggedIn,
  isAuthorized("admin"),
  upload.single("profile"),
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

adminRouter.get(
  "/latestAttendanceById/:id",
  isLoggedIn,
  isAuthorized("admin"),
  latestAttendanceByIdController
);

adminRouter.get(
  "/getAttendanceDataByDate",
  isLoggedIn,
  getAttendanceDataByDateController
);

module.exports = adminRouter;
