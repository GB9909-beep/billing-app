const express = require('express');
const Bill = require('../models/Bill');
const generateInvoiceExcel = require('../utils/excelGenerator');

const router = express.Router();

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Please log in first.' });
  }
  next();
}

router.use(requireAuth);

// GET /api/download-excel/:id - Download Excel invoice
router.get('/download-excel/:id', async (req, res) => {
  try {
    const bill = await Bill.findOne({
      _id: req.params.id,
      userId: req.session.userId
    });

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found.' });
    }

    const buffer = await generateInvoiceExcel(bill);

    const filename = `Invoice_${bill.invoiceNo.replace(/\//g, '-')}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Download Excel error:', error);
    res.status(500).json({ error: 'Failed to generate Excel file.' });
  }
});

module.exports = router;
