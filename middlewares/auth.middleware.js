const jwt = require("jsonwebtoken");

exports.isLoggedIn = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res
      .status(501)
      .send({ message: "You Are Not Login, Please Login First!" });
  }

  const employeeData = jwt.verify(token, process.env.JWT_SECRET_KEY);

  req.employee = employeeData;

  next();
};

exports.isAuthorized =
  (...roles) =>
  async (req, res, next) => {
    const userType = req.employee.employee.usertype;

    if (!roles.includes(userType)) {
      return res
        .status(501)
        .send({ message: "You Are Not Authorized To Access This Routes" });
    }
    next();
  };
