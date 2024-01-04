const fs = require("fs");

exports.removeImage = async (image) => {
  // Removing Image From Server (it take call back function)
  fs.rm(`./uploads/${image.originalname}`, (err) => {
    if (!err) {
      console.log("File deleted successfully");
    } else {
      console.error(err);
    }
  });
};
