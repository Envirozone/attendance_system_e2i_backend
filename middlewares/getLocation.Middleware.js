const axios = require("axios");

exports.getLocation = async (latitude, longitude) => {
  try {
    const response = await axios.get(
      `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=e8222b950ee94b54ad953fa71f5dc238`
    );

    const result = response.data.results[0];
    return (locationName = `${result.formatted}`);
  } catch (error) {
    console.error("Error fetching location:", error.message);
  }
};
