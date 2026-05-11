const mongoose = require('mongoose');

// Archive schema is identical to Bill schema
const archiveItemSchema = new mongoose.Schema({
  sno: { type: Number, required: true },
  name: { type: String, required: true },
  hsn: { type: String, required: true },
  qty: { type: Number, required: true },
  rate: { type: Number, required: true },
  amount: { type: Number, required: true }
}, { _id: false });

const archiveSchema = new mongoose.Schema({
  originalBillId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invoiceNo: {
    type: String,
    required: true
  },
  invoiceDate: {
    type: Date,
    required: true
  },
  customer: {
    name: { type: String, required: true },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    gstin: { type: String, default: '' },
    state: { type: String, default: 'Maharashtra' }
  },
  items: [archiveItemSchema],
  total: { type: Number, required: true, default: 0 },
  cgst: { type: Number, required: true, default: 0 },
  sgst: { type: Number, required: true, default: 0 },
  labourCharge: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true, default: 0 },
  amountInWords: { type: String, default: '' },
  originalCreatedAt: {
    type: Date,
    required: true
  },
  archivedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Archive', archiveSchema);
