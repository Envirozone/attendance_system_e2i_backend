const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads"); // Destination folder for storing uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Use the original filename for storing the file
  },
});
const upload = multer({ storage });

module.exports = { upload };
