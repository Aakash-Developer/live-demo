const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const port = 5000;

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose
  .connect("mongodb://localhost:27017/uploadsDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// Define Employee Image Schema
const EmployeeImageSchema = new mongoose.Schema({
  employeeId: String,
  images: [
    {
      title: String,
      path: String,
    },
  ],
});

const EmployeeImage = mongoose.model("EmployeeImage", EmployeeImageSchema);

// Ensure 'uploads' directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// Multer Upload Middleware
const upload = multer({ storage: storage });

// Handle multiple image uploads under a single employeeId
app.post("/upload", upload.array("images", 10), async (req, res) => {
  let { titles, employeeId } = req.body;

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }

  try {
    if (typeof titles === "string") {
      titles = [titles];
    }

    const uploadedImages = req.files.map((file, index) => ({
      title: titles[index] || "Untitled",
      path: file.path,
    }));

    let employeeRecord = await EmployeeImage.findOne({ employeeId });

    if (employeeRecord) {
      employeeRecord.images.push(...uploadedImages);
      await employeeRecord.save();
    } else {
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
});

// Get images by employeeId
app.get("/images/:employeeId", async (req, res) => {
  try {
    const employeeImages = await EmployeeImage.findOne({ employeeId: req.params.employeeId });

    if (!employeeImages) {
      return res.status(404).json({ message: "No images found for this employee" });
    }

    res.json(employeeImages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching images", error });
  }
});

// Delete a specific image by filename
app.delete("/delete/:employeeId/:filename", async (req, res) => {
  const { employeeId, filename } = req.params;
  try {
    // Find employee record
    const employeeRecord = await EmployeeImage.findOne({ employeeId });

    if (!employeeRecord) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Find the image in the employee record
    const imageIndex = employeeRecord.images.findIndex((img) => img.path.includes(filename));

    if (imageIndex === -1) {
      return res.status(404).json({ message: "Image not found" });
    }

    const imagePath = employeeRecord.images[imageIndex].path;

    // Remove the image from the database
    employeeRecord.images.splice(imageIndex, 1);
    await employeeRecord.save();

    // Delete the file from the filesystem
    fs.unlink(imagePath, (err) => {
      if (err) console.log("File deletion error:", err);
    });

    res.json({ message: "Image deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting image", error });
  }
});

// Delete all images for a specific employee/
app.delete("/delete/:employeeId", async (req, res) => {
  const { employeeId } = req.params;
  try {
    const employeeRecord = await EmployeeImage.findOne({ employeeId });

    if (!employeeRecord) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Delete each file from the filesystem
    for (const img of employeeRecord.images) {
      fs.unlink(img.path, (err) => {
        if (err) console.log("File deletion error:", err);
      });
    }

    // Remove the record from the database
    await EmployeeImage.deleteOne({ employeeId });

    res.json({ message: "All images deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting images", error });
  }
});

// Serve Uploaded Files
app.use("/uploads", express.static("uploads"));

// Start Server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
