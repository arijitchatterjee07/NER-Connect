const db = require('../config/db');

async function affectedVehicles(roadId) {
  const { rows } = await db.query(
    `SELECT id, vehicle_number, route_id, status, eta_minutes FROM vehicles WHERE route_id = $1`,
    [roadId]
  );
  return rows;
}

async function updateRoadAfterIncident(roadId, severity, type) {
  if (!roadId) return;
  if (severity === 'CRITICAL' || type === 'BLOCKADE' || type === 'BRIDGE_DOWN') {
    await db.query(`UPDATE roads SET status='BLOCKED', updated_at=NOW() WHERE id=$1`, [roadId]);
  } else if (severity === 'HIGH' || type === 'LANDSLIDE' || type === 'FLOOD') {
    await db.query(`UPDATE roads SET status='HIGH RISK', updated_at=NOW() WHERE id=$1 AND status <> 'BLOCKED'`, [roadId]);
  }
}

module.exports = { affectedVehicles, updateRoadAfterIncident };
