// const stockSchema = new mongoose.Schema({
//     item: {
//         type: String,
//         required: true
//     },
//     category: {
//         type: String,
//         required: true
//     },
//     quantity: {
//         type: Number,
//         required: true,
//         min: 0
//     },
//     price: {
//         type: Number,
//         required: true,
//         min: 0
//     }
// });

// // Create model
// const Stock = mongoose.model("Stock", stockSchema);

// module.exports = Stock;
// models/Inventory.js
const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema({
  SerialNo: { type: Number, required: true },
  PONo: { type: String, required: true },
  PODate: { type: String },  // you can also use Date if format is consistent
  Description: { type: String, required: true },
  Qty: { type: Number, required: true, min: 0 },
  Cost: { type: Number, required: true, min: 0 },
  BillNo: { type: String },
  Supplier: { type: String },
  ReceiptDate: { type: String },  // or Date
  DeptLab: { type: String },
  Dept: { type: String },
  FoundOK: { type: String },
  Shortage: { type: Number },
  Excess: { type: Number },
  Location: { type: String },
  Remarks: { type: String }
});

const Stock = mongoose.model("Stock", stockSchema);

module.exports = Stock;

