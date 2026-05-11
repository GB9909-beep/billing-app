const express = require('express');
const Customer = require('../models/Customer');

const router = express.Router();

// Auth middleware - checks if user is logged in
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Please log in first.' });
  }
  next();
}

// Apply auth to all routes
router.use(requireAuth);

// GET /api/customers - List all customers for logged-in user
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find({ userId: req.session.userId })
      .sort({ name: 1 });
    res.json(customers);
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers.' });
  }
});

// POST /api/customers - Add a new customer
router.post('/', async (req, res) => {
  try {
    const { name, phone, address, gstin, state } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }

    const customer = await Customer.create({
      userId: req.session.userId,
      name: name.trim(),
      phone: phone || '',
      address: address || '',
      gstin: gstin || '',
      state: state || 'Maharashtra'
    });

    res.status(201).json(customer);
  } catch (error) {
    console.error('Add customer error:', error);
    res.status(500).json({ error: 'Failed to add customer.' });
  }
});

// PUT /api/customers/:id - Update a customer
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, address, gstin, state } = req.body;

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.userId },
      { name, phone, address, gstin, state },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    res.json(customer);
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Failed to update customer.' });
  }
});

// DELETE /api/customers/:id - Delete a customer
router.delete('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({
      _id: req.params.id,
      userId: req.session.userId
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    res.json({ message: 'Customer deleted successfully.' });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Failed to delete customer.' });
  }
});

module.exports = router;
