const db = require('../config/db');

async function getDashboard() {

  const [
    roads,
    vehicles,
    incidents,
    deliveries
  ] = await Promise.all([

    // -----------------------------------------
    // ROADS
    // -----------------------------------------

    db.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE status = 'BLOCKED'
        )::int AS blocked
      FROM roads
    `),


    // -----------------------------------------
    // VEHICLES
    // -----------------------------------------

    db.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE status IN ('DELAYED', 'AT RISK')
        )::int AS delayed
      FROM vehicles
    `),


    // -----------------------------------------
    // ACTIVE INCIDENTS
    // Count ALL unresolved incidents
    // -----------------------------------------

    db.query(`
      SELECT
        COUNT(*)::int AS active
      FROM incidents
      WHERE resolved = false
    `),


    // -----------------------------------------
    // DELIVERIES
    // -----------------------------------------

    db.query(`
      SELECT
        COUNT(*)::int AS total
      FROM deliveries
    `)

  ]);


  // -----------------------------------------
  // VEHICLE STATISTICS
  // -----------------------------------------

  const totalVehicles =
    vehicles.rows[0].total || 0;

  const delayed =
    vehicles.rows[0].delayed || 0;


  // -----------------------------------------
  // ON-TIME PERCENTAGE
  // -----------------------------------------

  const onTime =
    totalVehicles
      ? Math.round(
          100 -
          (delayed / totalVehicles) * 38
        )
      : 100;


  // -----------------------------------------
  // ROAD ACCESSIBILITY
  // -----------------------------------------

  const totalRoads =
    roads.rows[0].total || 0;

  const blockedRoads =
    roads.rows[0].blocked || 0;


  const accessibility =
    totalRoads
      ? Math.max(
          0,
          100 - blockedRoads * 15
        )
      : 100;


  // -----------------------------------------
  // RETURN DASHBOARD DATA
  // -----------------------------------------

  return {

    accessibility,

    fleetCount:
      totalVehicles,

    activeAlerts:
      incidents.rows[0].active || 0,

    onTimePercentage:
      Math.max(
        0,
        Math.min(
          100,
          onTime
        )
      ),

    blockedRoads,

    deliveries:
      deliveries.rows[0].total || 0

  };
}


module.exports = {
  getDashboard
};