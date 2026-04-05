import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { router } from './routes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

// All routes are prefixed with /api
app.use('/api', router);

// Global error handler — must be registered last
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✓ Server running at http://localhost:${PORT}`);
});
