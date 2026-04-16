import express from 'express';
import cors from 'cors';
import availabilityRoutes from './routes/availability';
import sessionsRoutes from './routes/sessions';
import bookingsRoutes from './routes/bookings';
import notificationsRoutes from './routes/notifications';
import invitesRoutes from './routes/invites';
import publicRoutes from './routes/public';
import waitlistRoutes from './routes/waitlist';
import messagesRoutes from './routes/messages';

const app = express();
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/availability', availabilityRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api', notificationsRoutes);
app.use('/api/invites', invitesRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/messages', messagesRoutes);

export default app;
