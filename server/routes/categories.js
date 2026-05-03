const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { protect, authorize } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { search = '', sortBy = 'name', sortOrder = 'asc', page = 1, limit = 20 } = req.query;
    const query = search ? { name: { $regex: search, $options: 'i' } } : {};
    
    const categories = await Category.find(query)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Category.countDocuments(query);

    res.json({
      categories,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalCategories: count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const category = new Category(req.body);
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
