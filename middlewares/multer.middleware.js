const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads"); // Destination folder for storing uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Use the original filename for storing the file
  },
});

// Create a single Multer instance to handle single file inputs
const upload = multer({ storage });

// Create a single Multer instance to handle both file inputs
const uploads = multer({ storage }).fields([
  { name: "image1", maxCount: 1 },
  { name: "image2", maxCount: 1 },
]);

module.exports = {
  upload: upload,
  uploads: uploads,
};
