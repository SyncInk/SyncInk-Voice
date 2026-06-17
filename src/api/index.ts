import express from 'express';
import cors from 'cors';
import { ENV } from '../config/config';

export const startApi = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/', (req, res) => {
    res.json({ message: 'Syncink Voice API is running.' });
  });

  // Example route to fetch server settings for dashboard
  app.get('/api/guilds/:id/settings', (req, res) => {
    // Implement Discord OAuth2 validation middleware before accessing DB
    res.json({ message: 'Settings route placeholder' });
  });

  app.listen(ENV.PORT, () => {
    console.log(`[API] Dashboard API running on port ${ENV.PORT}`);
  });
};
