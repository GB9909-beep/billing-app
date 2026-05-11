const express = require('express');
const Bill = require('../models/Bill');
const numberToWords = require('../utils/numberToWords');

const router = express.Router();

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Please log in first.' });
  }
  next();
}

router.use(requireAuth);

// GET /api/next-invoice-number - Get the next auto-increment invoice number
router.get('/next-invoice-number', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const prefix = `AC-${currentYear}-`;

    // Find the last bill with matching prefix
    const lastBill = await Bill.findOne({ invoiceNo: { $regex: `^${prefix}` } })
      .sort({ invoiceNo: -1 });

    let nextNumber = 1;
    if (lastBill) {
      const lastNum = parseInt(lastBill.invoiceNo.split('-').pop());
      nextNumber = lastNum + 1;
    }

    const invoiceNo = `${prefix}${String(nextNumber).padStart(4, '0')}`;
    res.json({ invoiceNo });
  } catch (error) {
    console.error('Get next invoice number error:', error);
    res.status(500).json({ error: 'Failed to generate invoice number.' });
  }
});

// GET /api/bills - List all bills for logged-in user
router.get('/', async (req, res) => {
  try {
    const bills = await Bill.find({ userId: req.session.userId })
      .sort({ createdAt: -1 });
    res.json(bills);
  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({ error: 'Failed to fetch bills.' });
  }
});

// GET /api/bills/:id - Get a single bill
router.get('/:id', async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, userId: req.session.userId });
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found.' });
    }
    res.json(bill);
  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({ error: 'Failed to fetch bill.' });
  }
});

// POST /api/create-bill - Create a new bill
router.post('/create-bill', async (req, res) => {
  try {
    const {
      invoiceNo, invoiceDate, customer, items,
      labourCharge, discount
    } = req.body;

    // Validate required fields
    if (!invoiceNo || !customer || !customer.name || !items || items.length === 0) {
      return res.status(400).json({ error: 'Invoice number, customer name, and at least one item are required.' });
    }

    // Calculate totals
    let total = 0;
    const processedItems = items.map((item, index) => {
      const amount = item.qty * item.rate;
      total += amount;
      return {
        sno: index + 1,
        name: item.name,
        hsn: item.hsn,
        qty: parseFloat(item.qty),
        rate: parseFloat(item.rate),
        amount: parseFloat(amount.toFixed(2))
      };
    });

    total = parseFloat(total.toFixed(2));
    const cgst = parseFloat((total * 0.025).toFixed(2));
    const sgst = parseFloat((total * 0.025).toFixed(2));
    const labour = parseFloat(labourCharge || 0);
    const disc = parseFloat(discount || 0);
    const grandTotal = parseFloat((total + cgst + sgst + labour - disc).toFixed(2));
    const amountInWords = numberToWords(grandTotal);

    const bill = await Bill.create({
      userId: req.session.userId,
      invoiceNo,
      invoiceDate: invoiceDate || new Date(),
      customer: {
        name: customer.name,
        address: customer.address || '',
        phone: customer.phone || '',
        gstin: customer.gstin || '',
        state: customer.state || 'Maharashtra'
      },
      items: processedItems,
      total,
      cgst,
      sgst,
      labourCharge: labour,
      discount: disc,
      grandTotal,
      amountInWords
    });

    res.status(201).json(bill);
  } catch (error) {
    console.error('Create bill error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Invoice number already exists.' });
    }
    res.status(500).json({ error: 'Failed to create bill.' });
  }
});

// PUT /api/bills/:id - Update an existing bill
router.put('/:id', async (req, res) => {
  try {
    const {
      invoiceNo, invoiceDate, customer, items,
      labourCharge, discount
    } = req.body;

    if (!invoiceNo || !customer || !customer.name || !items || items.length === 0) {
      return res.status(400).json({ error: 'Invoice number, customer name, and at least one item are required.' });
    }

    // Check if invoice number is taken by another bill
    const existingBill = await Bill.findOne({ invoiceNo, _id: { $ne: req.params.id } });
    if (existingBill) {
      return res.status(400).json({ error: 'Invoice number already exists.' });
    }

    let total = 0;
    const processedItems = items.map((item, index) => {
      const amount = item.qty * item.rate;
      total += amount;
      return {
        sno: index + 1,
        name: item.name,
        hsn: item.hsn,
        qty: parseFloat(item.qty),
        rate: parseFloat(item.rate),
        amount: parseFloat(amount.toFixed(2))
      };
    });

    total = parseFloat(total.toFixed(2));
    const cgst = parseFloat((total * 0.025).toFixed(2));
    const sgst = parseFloat((total * 0.025).toFixed(2));
    const labour = parseFloat(labourCharge || 0);
    const disc = parseFloat(discount || 0);
    const grandTotal = parseFloat((total + cgst + sgst + labour - disc).toFixed(2));
    const amountInWords = numberToWords(grandTotal);

    const bill = await Bill.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      {
        invoiceNo,
        invoiceDate: invoiceDate || new Date(),
        customer: {
          name: customer.name,
          address: customer.address || '',
          phone: customer.phone || '',
          gstin: customer.gstin || '',
          state: customer.state || 'Maharashtra'
        },
        items: processedItems,
        total,
        cgst,
        sgst,
        labourCharge: labour,
        discount: disc,
        grandTotal,
        amountInWords
      },
      { new: true }
    );

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found.' });
    }

    res.json(bill);
  } catch (error) {
    console.error('Update bill error:', error);
    res.status(500).json({ error: 'Failed to update bill.' });
  }
});

// DELETE /api/bills/:id - Delete a bill
router.delete('/:id', async (req, res) => {
  try {
    const bill = await Bill.findOneAndDelete({ _id: req.params.id, userId: req.session.userId });
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found.' });
    }
    res.json({ message: 'Bill deleted successfully.' });
  } catch (error) {
    console.error('Delete bill error:', error);
    res.status(500).json({ error: 'Failed to delete bill.' });
  }
});

module.exports = router;
