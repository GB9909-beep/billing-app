const express = require('express');
const Product = require('../models/Product');

const router = express.Router();

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Please log in first.' });
  }
  next();
}

router.use(requireAuth);

// GET /api/products - List all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ name: 1 });
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// POST /api/products - Add a new product
router.post('/', async (req, res) => {
  try {
    const { name, hsn, rate } = req.body;

    if (!name || !hsn || rate === undefined) {
      return res.status(400).json({ error: 'Product name, HSN code, and rate are required.' });
    }

    const product = await Product.create({
      name: name.trim(),
      hsn: hsn.trim(),
      rate: parseFloat(rate)
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ error: 'Failed to add product.' });
  }
});

// PUT /api/products/:id - Update a product
router.put('/:id', async (req, res) => {
  try {
    const { name, hsn, rate } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, hsn, rate: parseFloat(rate) },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product.' });
  }
});

// DELETE /api/products/:id - Delete a product
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

module.exports = router;
