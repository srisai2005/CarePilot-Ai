const { v4: uuid } = require('uuid');
const db = require('../data/db');
const { AppError } = require('../middleware/errorHandler');

const COLLECTION = 'reminders';

async function createReminder({ recordId, title, date, notes, userId = 'default-user' }) {
  if (!title || !date) {
    throw new AppError('A reminder needs at least a title and a date.', 400);
  }
  const reminder = {
    id: uuid(),
    userId,
    recordId: recordId || null,
    title,
    date,
    notes: notes || '',
    done: false,
    createdAt: new Date().toISOString(),
  };
  await db.insert(COLLECTION, reminder);
  return reminder;
}

async function listReminders(userId = 'default-user') {
  const all = await db.getAll(COLLECTION);
  return all
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

async function markDone(id, done = true) {
  const updated = await db.update(COLLECTION, id, { done });
  if (!updated) throw new AppError('Reminder not found.', 404);
  return updated;
}

async function deleteReminder(id) {
  const removed = await db.remove(COLLECTION, id);
  if (!removed) throw new AppError('Reminder not found.', 404);
  return true;
}

module.exports = { createReminder, listReminders, markDone, deleteReminder };
