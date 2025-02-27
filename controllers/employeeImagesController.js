const upload = require("../config/multerConfig");

const uploadImages = [
  upload.array("images", 10),
  async (req, res) => {
    const { titles, employeeId } = req.body; // Get employeeId and titles array

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    try {
      const uploadedImages = req.files.map((file, index) => ({
        title: titles || "Untitled",
        path: file.path,
      }));

      // Check if employeeId already exists
      let employeeRecord = await EmployeeImage.findOne({ employeeId });

      if (employeeRecord) {
        // Append new images to existing employee record
        employeeRecord.images.push(...uploadedImages);
        await employeeRecord.save();
      } else {
        // Create a new employee record
        employeeRecord = new EmployeeImage({
          employeeId,
          images: uploadedImages,
        });
        await employeeRecord.save();
      }

      res.json({ message: "Files uploaded successfully", employee: employeeRecord });
    } catch (error) {
      res.status(500).json({ message: "Error saving to database", error });
    }
  },
];

module.exports = { uploadImages };
