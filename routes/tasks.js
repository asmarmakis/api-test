const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Task = require('../models/Task');

// Get all tasks with filtering, sorting and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      startDate,
      endDate
    } = req.query;

    // Prepare where clause for filtering
    const whereClause = {};
    if (status) {
      whereClause.status = status;
    }
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    if (startDate && endDate) {
      whereClause.dueDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Validate sortBy field
    const allowedSortFields = ['title', 'status', 'dueDate', 'createdAt'];
    if (!allowedSortFields.includes(sortBy)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid sort field' 
      });
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const totalCount = await Task.count({ where: whereClause });
    const totalPages = Math.ceil(totalCount / limit);

    // Get tasks with filters and pagination
    const tasks = await Task.findAll({
      where: whereClause,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: offset
    });

    res.json({
      success: true,
      data: tasks,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: totalCount,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
});

// Create a new task
router.post('/', async (req, res) => {
  try {
    // Validasi input
    if (!req.body.title) {
      return res.status(400).json({ message: 'Judul tugas harus diisi' });
    }

    // Membuat tugas baru
    const task = await Task.create({
      title: req.body.title,
      description: req.body.description || null,
      status: req.body.status || 'pending',
      dueDate: req.body.dueDate || null
    });

    // Response sukses
    res.status(201).json({
      success: true,
      message: 'Tugas berhasil dibuat',
      data: task
    });
  } catch (err) {
    // Response error
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
});

// Get a specific task
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (task) {
      res.json(task);
    } else {
      res.status(404).json({ message: 'Tugas tidak ditemukan' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a task (partial update)
router.patch('/:id', async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Tugas tidak ditemukan' });
    }

    await task.update({
      title: req.body.title || task.title,
      description: req.body.description || task.description,
      status: req.body.status || task.status,
      dueDate: req.body.dueDate || task.dueDate
    });

    res.json(task);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a task (full update)
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tugas tidak ditemukan'
      });
    }

    // Validasi input yang diperlukan
    if (!req.body.title) {
      return res.status(400).json({
        success: false,
        message: 'Judul tugas harus diisi'
      });
    }

    // Update task dengan data baru
    await task.update({
      title: req.body.title,
      description: req.body.description || null,
      status: req.body.status || 'pending',
      dueDate: req.body.dueDate || null
    });

    res.json({
      success: true,
      message: 'Tugas berhasil diupdate',
      data: task
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
});

// Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Tugas tidak ditemukan' });
    }
    await task.destroy();
    res.json({ message: 'Tugas berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;