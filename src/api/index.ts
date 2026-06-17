import express from 'express';
import cors from 'cors';
import path from 'path';
import { ENV } from '../config/config';
import { UserProfile } from '../database/models/UserProfile';

export const startApi = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get('/api/users/me', async (req, res) => {
    // Mock user for now since Discord OAuth isn't hooked up yet
    const mockUserId = '123456789012345678';
    
    try {
      let profile = await UserProfile.findOne({ userId: mockUserId });
      if (!profile) {
        profile = await UserProfile.create({ userId: mockUserId });
      }
      res.json({
        user: {
          id: mockUserId,
          username: 'DemoUser',
          avatar: null
        },
        settings: {
          defaultName: profile.defaultName,
          defaultLimit: profile.defaultLimit,
          defaultBitrate: profile.defaultBitrate,
          isPremium: profile.isPremium
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  app.post('/api/users/settings', async (req, res) => {
    const mockUserId = '123456789012345678';
    const { defaultName, defaultLimit, defaultBitrate } = req.body;

    try {
      const profile = await UserProfile.findOneAndUpdate(
        { userId: mockUserId },
        { defaultName, defaultLimit, defaultBitrate },
        { new: true, upsert: true }
      );
      res.json({ success: true, settings: profile });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save settings' });
    }
  });

  // Serve static React dashboard in production
  app.use(express.static(path.join(__dirname, '../../dashboard/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dashboard/dist/index.html'));
  });

  app.listen(ENV.PORT, () => {
    console.log(`[API] Dashboard API running on port ${ENV.PORT}`);
  });
};
