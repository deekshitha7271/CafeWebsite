const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const stream = require('stream');
const _ = require('lodash');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const { protect, authorize } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

// Normalization function: Handles spaces and inconsistent casing
const normalizeHeader = (header) => _.camelCase(header.trim());

router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      category = '',
      dietary = '',
      sortBy = 'itemName',
      sortOrder = 'asc'
    } = req.query;

    const query = {};

    // Global Search
    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: 'i' } },
        { itemId: { $regex: search, $options: 'i' } }
      ];
    }

    // Filters
    if (category) query.categoryId = category;
    if (dietary) query.dietaryTag = { $regex: new RegExp(`^${dietary}$`, 'i') };

    const options = {
      populate: 'categoryId',
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      skip: (parseInt(page) - 1) * parseInt(limit),
      limit: parseInt(limit),
    };

    const items = await MenuItem.find(query)
      .populate('categoryId', 'name')
      .sort(options.sort)
      .skip(options.skip)
      .limit(options.limit);

    const totalItems = await MenuItem.countDocuments(query);

    res.json({
      items,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unique dietary tags for filters
router.get('/dietary-tags', async (req, res) => {
  try {
    const tags = await MenuItem.distinct('dietaryTag');
    res.json(tags.filter(tag => tag && tag.trim() !== ''));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk Update API
router.patch('/bulk-update', protect, authorize('admin'), async (req, res) => {
  const { ids, operation, value } = req.body;
  if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'Selection required' });

  try {
    let update = {};
    switch (operation) {
      case 'delete':
        await MenuItem.deleteMany({ _id: { $in: ids } });
        return res.json({ message: `Successfully deleted ${ids.length} items` });
      case 'updateCategory':
        update = { categoryId: value };
        break;
      case 'updateStatus':
        update = { isAvailable: value };
        break;
      case 'updateDietary':
        update = { dietaryTag: value };
        break;
      case 'priceOffset':
        // Complex update using aggregation or multiple updates
        // For simplicity, we'll use a loop or $inc
        await MenuItem.updateMany({ _id: { $in: ids } }, { $inc: { itemOnlinePrice: parseFloat(value), price: parseFloat(value) } });
        return res.json({ message: 'Prices updated' });
      default:
        return res.status(400).json({ error: 'Invalid operation' });
    }

    const result = await MenuItem.updateMany({ _id: { $in: ids } }, update);
    res.json({ message: `${result.modifiedCount} items updated`, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Inline Single Field Update
router.patch('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Other routes (keep for backward compatibility or direct access)
router.get('/:id', async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id).populate('categoryId', 'name');
    if (!item) return res.status(404).json({ message: 'Menu item not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Smart Bulk Upload API
router.post('/bulk-upload', protect, authorize('admin'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const results = { itemsAdded: 0, itemsUpdated: 0, itemsFailed: 0, errors: [] };
  const rows = [];

  const bufferStream = new stream.PassThrough();
  bufferStream.end(req.file.buffer);

  bufferStream
    .pipe(csv({
      mapHeaders: ({ header }) => {
        const normalized = normalizeHeader(header);
        // Explicit mapping for provided CSV columns
        const mapping = {
          'itemId': 'itemId',
          'sku': 'itemId',
          'categoryName': 'categoryName',
          'itemName': 'itemName',
          'itemOnline': 'itemOnlineDisplayName',
          'itemOnlineDisplayName': 'itemOnlineDisplayName',
          'price': 'itemOnlinePrice',
          'itemOnlinePrice': 'itemOnlinePrice',
          'onlinePrice': 'itemOnlinePrice',
          'rankOrder': 'rankOrder',
          'rank': 'rankOrder',
          'allowVariation': 'allowVariation',
          'dietaryTag': 'dietaryTag'
        };
        return mapping[normalized] || normalized;
      }
    }))
    .on('data', (data) => {
      if (rows.length === 0) console.log('First Row Parsed:', data);
      rows.push(data);
    })
    .on('error', (err) => {
      console.error('CSV Parsing Error:', err);
      res.status(500).json({ error: 'Failed to process CSV', detail: err.message });
    })
    .on('end', async () => {
      for (const row of rows) {
        try {
          // 1. Data Normalization & Validation
          const itemName = row.itemName?.trim();
          const categoryName = row.categoryName?.trim();
          const itemOnlinePrice = parseFloat(row.itemOnlinePrice);
          const itemOnlineDisplayName = row.itemOnlineDisplayName?.trim() || itemName;
          const rankOrder = parseInt(row.rankOrder) || 0;

          // Flexible boolean parsing
          const allowVariationString = row.allowVariation?.toLowerCase();
          const allowVariation = allowVariationString === 'true' || allowVariationString === '1' || allowVariationString === 'yes';

          const dietaryTag = row.dietaryTag?.trim() || '';
          const itemId = row.itemId?.trim();

          if (!itemName || !categoryName || isNaN(itemOnlinePrice)) {
            results.itemsFailed++;
            const missing = [];
            if (!itemName) missing.push('Item Name');
            if (!categoryName) missing.push('Category Name');
            if (isNaN(itemOnlinePrice)) missing.push('Price (Parsed: ' + row.itemOnlinePrice + ')');

            results.errors.push({
              rowPreview: itemName || Object.values(row)[0],
              reason: `Missing/Invalid required fields: ${missing.join(', ')}`,
              availableKeys: Object.keys(row)
            });
            continue;
          }

          // 2. Smart Category Auto-Creation
          let category = await Category.findOne({ name: { $regex: new RegExp(`^${categoryName}$`, 'i') } });
          if (!category) {
            category = new Category({
              name: categoryName,
              icon: '🍽️'
            });
            await category.save();
          }

          // 3. Smart Update/Insert Logic
          const filter = {
            itemName: { $regex: new RegExp(`^${itemName}$`, 'i') },
            categoryId: category._id
          };

          const update = {
            itemId,
            itemName,
            name: itemName,
            itemOnlineDisplayName,
            itemOnlinePrice,
            price: itemOnlinePrice,
            categoryName: category.name,
            categoryId: category._id,
            rankOrder,
            allowVariation,
            dietaryTag,
            isAvailable: true
          };

          const options = { upsert: true, new: true, includeResultMetadata: true };
          const result = await MenuItem.findOneAndUpdate(filter, update, options);

          // Support both old and new MongoDB driver result formats
          const isUpdate = result.lastErrorObject ? result.lastErrorObject.updatedExisting : !result.upsertedId;

          if (isUpdate) {
            results.itemsUpdated++;
          } else {
            results.itemsAdded++;
          }
        } catch (err) {
          console.error('Row process error:', err);
          results.itemsFailed++;
          results.errors.push({
            rowPreview: row.itemName || Object.values(row)[0] || 'Unknown Row',
            reason: err.message,
            availableKeys: Object.keys(row)
          });
        }
      }
      if (results.itemsFailed > 0) {
        console.log(` ${results.itemsFailed} items failed processing.`);
        console.log('Sample Error Reasons:', results.errors.slice(0, 5).map(e => ({ reason: e.reason, rowKeys: Object.keys(e.row) })));
      }
      res.json(results);
    });
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const item = new MenuItem(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Menu item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
