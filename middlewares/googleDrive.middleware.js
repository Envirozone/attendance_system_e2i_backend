const fs = require("fs");
// Importing Google Drive Package
const { google } = require("googleapis");

// Your Google Cloud Platform credentials file
const auth = require("../auth.json");

// Google Drive APIs Configuration
const drive = google.drive({
  version: "v3",
  auth: new google.auth.GoogleAuth({
    credentials: auth,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  }),
});

exports.uploadImageOnGoogleDrive = async (image) => {
  try {
    const response = await drive.files.create({
      requestBody: {
        name: image.originalname,
        mimeType: image.mimetype,
        // Get From Created Folder URL on Google Drive
        parents: ["1saKmG_cZnsWUBNiST6QtmVOvQnrgSD84"],
      },
      media: {
        body: fs.createReadStream(image.path),
      },
    });

    // Save additional data to your backend (you can modify this part as needed)
    const { data } = response;
    const imgId = data.id;
    return imgId;
  } catch (error) {
    console.error("Error fetching location:", error.message);
  }
};
