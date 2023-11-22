const Employee = require("../models/userModel");
const jwt = require("jsonwebtoken");

exports.userSignupController = async (req, res) => {
  console.log("11");
  try {
    const { password, email, username, first_name } = req.body;

    if (!first_name || !username || !email || !password) {
      return res.status(501).send("Please Fill All Fields");
    }

    const existEmployee = await Employee.findOne({ email });

    if (existEmployee) {
      return res
        .status(501)
        .send({ message: "Employee Already Exist With This Email" });
    }

    const employee = new Employee(req.body);

    await employee.save();

    if (!employee) {
      return res
        .status(501)
        .send({ message: "Employee Data Not Created, Please Try Again!" });
    }
    res
      .status(200)
      .send({ message: "Employee Data Created", employee, success: true });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
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

    // Generate the JWT
    const token = jwt.sign({ employee }, process.env.JWT_SECRET_KEY, {
      expiresIn: "365d",
    });

    employee.password = undefined;

    // Set the token in a cookie
    res.cookie("token", token, {
      httpOnly: true,
      // secure: true,
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    res
      .status(200)
      .send({ message: "SuccessFully Login", employee, success: true });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.userLogoutController = async (req, res) => {
  try {
    res.clearCookie("token");
    res.status(200).send({ message: "SuccessFully Logout" });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

exports.getUserController = async (req, res) => {
  try {
    const employee = req.employee;
    res
      .status(200)
      .send({ message: "Employee Data Successfully Fetched", employee });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};
