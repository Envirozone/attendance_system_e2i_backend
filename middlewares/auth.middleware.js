const jwt = require("jsonwebtoken");

exports.isLoggedIn = (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return res
      .status(501)
      .send({ message: "You Are Not Login, Please Login First!" });
  }

  const employeeData = jwt.verify(token, process.env.JWT_SECRET_KEY);

  req.employee = employeeData;

  next();
};
