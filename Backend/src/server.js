require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(s => s.trim());

app.use(cors({ origin: allowedOrigins.includes('*') ? true : allowedOrigins }));
app.use(express.json({ limit: '1mb' }));

const io = new Server(server, { cors: { origin: allowedOrigins.includes('*') ? '*' : allowedOrigins, methods: ['GET','POST','PATCH'] } });
app.set('io', io);

io.on('connection', socket => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

app.get('/', (req,res)=>res.json({ name:'NER Connect Backend', version:'1.0.0', status:'running' }));
app.use('/api/health', require('./routes/health.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/vehicles', require('./routes/vehicles.routes'));
app.use('/api/roads', require('./routes/roads.routes'));
app.use('/api/incidents', require('./routes/incidents.routes'));
app.use('/api/weather', require('./routes/weather.routes'));
app.use('/api/risk', require('./routes/risk.routes'));
app.use('/api/routes', require('./routes/routes.routes'));
app.use('/api/reroute', require('./routes/reroute.routes'));
app.use('/api/reports', require('./routes/reports.routes'));
app.use('/api/sync', require('./routes/reports.routes'));
app.use('/api/deliveries', require('./routes/deliveries.routes'));

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT || 5000);
server.listen(PORT, ()=>console.log(`NER Connect backend running on http://localhost:${PORT}`));
