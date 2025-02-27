const mongoose = require("mongoose");

const EmployeeImageSchema = new mongoose.Schema({
  employeeId: String,
  images: [
    {
      title: String,
      path: String,
    },
  ],
});

module.exports = mongoose.model("EmployeeImage", EmployeeImageSchema);
