const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'techpacker_app';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

let db;
let techpacksCol;
let activitiesCol;
let materialsCol;
let measurementTemplatesCol;
let colorwaysCol;
let revisionsCol;

async function start() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  techpacksCol = db.collection('techpacks');
  activitiesCol = db.collection('activities');
  materialsCol = db.collection('materials');
  measurementTemplatesCol = db.collection('measurement_templates');
  colorwaysCol = db.collection('colorways');
  revisionsCol = db.collection('revisions');

  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Techpacks
  app.get('/techpacks', async (_req, res) => {
    const items = await techpacksCol.find().sort({ lastModified: -1 }).toArray();
    res.json(items);
  });

  app.post('/techpacks', async (req, res) => {
    const doc = req.body;
    doc._id = doc.id;
    await techpacksCol.insertOne(doc);
    res.status(201).json(doc);
  });

  app.put('/techpacks/:id', async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    await techpacksCol.updateOne({ _id: id }, { $set: update });
    const saved = await techpacksCol.findOne({ _id: id });
    res.json(saved);
  });

  app.delete('/techpacks/:id', async (req, res) => {
    const id = req.params.id;
    await techpacksCol.deleteOne({ _id: id });
    res.status(204).end();
  });

  // Activities
  app.get('/activities', async (_req, res) => {
    const items = await activitiesCol.find().sort({ _id: -1 }).toArray();
    res.json(items);
  });

  app.post('/activities', async (req, res) => {
    const doc = req.body;
    doc._id = doc.id;
    await activitiesCol.insertOne(doc);
    res.status(201).json(doc);
  });

  // Materials Library
  app.get('/materials', async (_req, res) => {
    const items = await materialsCol.find().sort({ _id: -1 }).toArray();
    res.json(items);
  });
  app.post('/materials', async (req, res) => {
    const doc = req.body;
    doc._id = doc.id;
    await materialsCol.insertOne(doc);
    res.status(201).json(doc);
  });
  app.put('/materials/:id', async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    await materialsCol.updateOne({ _id: id }, { $set: update });
    const saved = await materialsCol.findOne({ _id: id });
    res.json(saved);
  });
  app.delete('/materials/:id', async (req, res) => {
    const id = req.params.id;
    await materialsCol.deleteOne({ _id: id });
    res.status(204).end();
  });

  // Measurement Templates
  app.get('/measurement-templates', async (_req, res) => {
    const items = await measurementTemplatesCol.find().sort({ _id: -1 }).toArray();
    res.json(items);
  });
  app.post('/measurement-templates', async (req, res) => {
    const doc = req.body;
    doc._id = doc.id;
    await measurementTemplatesCol.insertOne(doc);
    res.status(201).json(doc);
  });
  app.put('/measurement-templates/:id', async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    await measurementTemplatesCol.updateOne({ _id: id }, { $set: update });
    const saved = await measurementTemplatesCol.findOne({ _id: id });
    res.json(saved);
  });
  app.delete('/measurement-templates/:id', async (req, res) => {
    const id = req.params.id;
    await measurementTemplatesCol.deleteOne({ _id: id });
    res.status(204).end();
  });

  // Colorways Library
  app.get('/colorways', async (_req, res) => {
    const items = await colorwaysCol.find().sort({ _id: -1 }).toArray();
    res.json(items);
  });
  app.post('/colorways', async (req, res) => {
    const doc = req.body;
    doc._id = doc.id;
    await colorwaysCol.insertOne(doc);
    res.status(201).json(doc);
  });
  app.put('/colorways/:id', async (req, res) => {
    const id = req.params.id;
    const update = req.body;
    await colorwaysCol.updateOne({ _id: id }, { $set: update });
    const saved = await colorwaysCol.findOne({ _id: id });
    res.json(saved);
  });
  app.delete('/colorways/:id', async (req, res) => {
    const id = req.params.id;
    await colorwaysCol.deleteOne({ _id: id });
    res.status(204).end();
  });

  // Revisions
  app.get('/techpacks/:id/revisions', async (req, res) => {
    const techpackId = req.params.id;
    const items = await revisionsCol.find({ techpackId }).sort({ version: -1 }).toArray();
    res.json(items);
  });
  app.post('/techpacks/:id/revisions', async (req, res) => {
    const techpackId = req.params.id;
    const doc = req.body;
    doc._id = doc.id;
    doc.techpackId = techpackId;
    await revisionsCol.insertOne(doc);
    res.status(201).json(doc);
  });
  app.post('/revisions/:id/comments', async (req, res) => {
    const id = req.params.id;
    const comment = req.body;
    await revisionsCol.updateOne({ _id: id }, { $push: { comments: comment } });
    const saved = await revisionsCol.findOne({ _id: id });
    res.json(saved);
  });
  app.post('/revisions/:id/approve', async (req, res) => {
    const id = req.params.id;
    await revisionsCol.updateOne({ _id: id }, { $set: { status: 'approved' } });
    const saved = await revisionsCol.findOne({ _id: id });
    res.json(saved);
  });
  app.post('/revisions/:id/reject', async (req, res) => {
    const id = req.params.id;
    await revisionsCol.updateOne({ _id: id }, { $set: { status: 'rejected' } });
    const saved = await revisionsCol.findOne({ _id: id });
    res.json(saved);
  });

  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});


