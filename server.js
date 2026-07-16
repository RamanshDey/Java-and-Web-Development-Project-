import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import connectDatabase from './src/config/db.js';
import authRoutes from './src/routes/auth.js';
import taskRoutes from './src/routes/tasks.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

connectDatabase();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Smart Task Management System' });
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = status === 500 ? 'Something went wrong on the server.' : err.message;
  res.status(status).json({ message });
});

app.listen(port, () => {
  console.log(`Smart Task Management System running at http://localhost:${port}`);
});
