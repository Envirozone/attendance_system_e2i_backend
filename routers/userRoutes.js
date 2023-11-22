const express = require("express");
const {
  userLoginController,
  userSignupController,
  userLogoutController,
  getUserController,
} = require("../controllers/userController");
const { isLoggedIn } = require("../middlewares/auth.middleware");
const userRouter = express.Router();

userRouter.post("/signup", userSignupController);
userRouter.post("/login", userLoginController);
userRouter.get("/logout", userLogoutController);
userRouter.get("/getUser", isLoggedIn, getUserController);

module.exports = userRouter;
