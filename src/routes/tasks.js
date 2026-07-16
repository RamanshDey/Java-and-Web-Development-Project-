import express from 'express';
import mongoose from 'mongoose';
import requireAuth from '../middleware/auth.js';
import Task from '../models/Task.js';

const router = express.Router();

router.use(requireAuth);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validateTaskInput(body, partial = false) {
  const errors = [];
  const input = {};

  if (!partial || body.title !== undefined) {
    input.title = String(body.title || '').trim();
    if (!input.title) errors.push('Task title is required.');
  }

  if (!partial || body.description !== undefined) {
    input.description = String(body.description || '').trim();
  }

  if (!partial || body.deadline !== undefined) {
    const deadline = new Date(body.deadline);
    if (Number.isNaN(deadline.getTime())) {
      errors.push('A valid deadline is required.');
    } else {
      input.deadline = deadline;
    }
  }

  if (!partial || body.priority !== undefined) {
    if (!['High', 'Medium', 'Low'].includes(body.priority)) {
      errors.push('Priority must be High, Medium, or Low.');
    } else {
      input.priority = body.priority;
    }
  }

  if (body.status !== undefined) {
    if (!['Pending', 'Completed'].includes(body.status)) {
      errors.push('Status must be Pending or Completed.');
    } else {
      input.status = body.status;
    }
  }

  return { input, errors };
}

async function findOwnedTask(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(404).json({ message: 'Task not found.' });
    return null;
  }

  const task = await Task.findOne({ _id: req.params.id, owner: req.user._id });

  if (!task) {
    res.status(404).json({ message: 'Task not found.' });
    return null;
  }

  return task;
}

router.get('/', async (req, res, next) => {
  try {
    const filter = { owner: req.user._id };
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim();
    const priority = String(req.query.priority || '').trim();

    if (status && ['Pending', 'Completed'].includes(status)) {
      filter.status = status;
    }

    if (priority && ['High', 'Medium', 'Low'].includes(priority)) {
      filter.priority = priority;
    }

    if (search) {
      const expression = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ title: expression }, { description: expression }];
    }

    const tasks = await Task.find(filter).sort({ status: -1, deadline: 1, createdAt: -1 });
    res.json({ tasks });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { input, errors } = validateTaskInput(req.body);

    if (errors.length) {
      return res.status(400).json({ message: errors[0] });
    }

    const task = await Task.create({ ...input, owner: req.user._id });
    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const task = await findOwnedTask(req, res);

    if (!task) return;

    const { input, errors } = validateTaskInput(req.body, true);

    if (errors.length) {
      return res.status(400).json({ message: errors[0] });
    }

    Object.assign(task, input);
    await task.save();
    res.json({ task });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/complete', async (req, res, next) => {
  try {
    const task = await findOwnedTask(req, res);

    if (!task) return;

    task.status = task.status === 'Completed' ? 'Pending' : 'Completed';
    await task.save();
    res.json({ task });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const task = await findOwnedTask(req, res);

    if (!task) return;

    await task.deleteOne();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
