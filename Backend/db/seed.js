require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});


// ============================================================
// ROADS
// ============================================================

const roads = [
  [
    'NH-13',
    'NH-13 · Bomdila — Tawang',
    'West Kameng',
    'ACCESSIBLE',
    18,
    22,
    18,
    18,
    'Asphalt',
    442,
    680,
    [
      [26.92, 92.62],
      [27.17, 92.45],
      [27.25, 92.42]
    ]
  ],

  [
    'NH-15',
    'NH-15 · Jorhat — Dhemaji',
    'Dhemaji',
    'ACCESSIBLE',
    25,
    32,
    28,
    24,
    'Asphalt',
    310,
    430,
    [
      [27.18, 94.18],
      [27.47, 94.58],
      [27.48, 94.73]
    ]
  ],

  [
    'SH-2',
    'SH-2 · Silchar — Aizawl',
    'Mizoram',
    'MODERATE',
    35,
    30,
    26,
    12,
    'Gravel',
    185,
    310,
    [
      [23.36, 92.76],
      [23.73, 92.72],
      [23.81, 92.63]
    ]
  ],

  [
    'NH-27',
    'NH-27 · Guwahati — Silchar corridor',
    'Assam',
    'ACCESSIBLE',
    22,
    26,
    24,
    40,
    'Asphalt',
    320,
    360,
    [
      [26.14, 91.73],
      [25.58, 91.88],
      [24.83, 92.79]
    ]
  ]
];


// ============================================================
// VEHICLES
// ============================================================

const vehicles = [
  [
    'MED-2841',
    'MED-2841',
    'Medical supplies',
    'MOVING',
    'Critical',
    'NH-13',
    'Guwahati → Tawang',
    26.92,
    92.62,
    38,
    680,
    10
  ],

  [
    'MED-2885',
    'MED-2885',
    'Vaccines',
    'MOVING',
    'Critical',
    'NH-13',
    'Tezpur → Tawang',
    27.17,
    92.45,
    55,
    515,
    8
  ],

  [
    'AGR-1059',
    'AGR-1059',
    'Fresh produce',
    'MOVING',
    'Standard',
    'NH-15',
    'Jorhat → Imphal',
    27.18,
    94.18,
    74,
    265,
    12
  ],

  [
    'CON-5532',
    'CON-5532',
    'Construction material',
    'DELAYED',
    'Standard',
    'SH-2',
    'Silchar → Aizawl',
    23.36,
    92.76,
    38,
    310,
    18
  ]
];


// ============================================================
// WEATHER
// ============================================================

const weather = [
  [
    'West Kameng',
    12,
    18,
    20,
    22,
    'Clear to partly cloudy'
  ],

  [
    'Dhemaji',
    24,
    30,
    34,
    27,
    'Partly cloudy'
  ],

  [
    'Tawang',
    18,
    22,
    24,
    12,
    'Cool and cloudy'
  ],

  [
    'Kamrup Metro',
    10,
    12,
    10,
    29,
    'Clear'
  ]
];


// ============================================================
// INCIDENTS
// ============================================================

const incidents = [
  [
    'Landslide risk · West Kameng',
    'Heavy rainfall reported. NH-13 may face closure within 6 hours.',
    'LANDSLIDE',
    'HIGH',
    'NH-13',
    'West Kameng',
    27.17,
    92.45
  ],

  [
    'Bridge under inspection · Barpeta',
    'Load restrictions are currently in effect on Beki bridge.',
    'BRIDGE_DOWN',
    'MEDIUM',
    null,
    'Barpeta',
    26.32,
    91.01
  ],

  [
    'Flooding reported · Dhemaji',
    'Water level rising near NH-15. Vehicles should proceed with caution.',
    'FLOOD',
    'HIGH',
    'NH-15',
    'Dhemaji',
    27.47,
    94.58
  ]
];


// ============================================================
// DELIVERIES
// ============================================================

const deliveries = [
  [
    'DEL-1001',
    'Medical supplies',
    '10 crates',
    'Guwahati',
    'Tawang District Hospital',
    'MED-2841',
    'IN TRANSIT',
    'Critical',
    680
  ],

  [
    'DEL-1002',
    'Vaccines',
    '6 cold-chain boxes',
    'Tezpur',
    'Tawang District Hospital',
    'MED-2885',
    'IN TRANSIT',
    'Critical',
    515
  ],

  [
    'DEL-1003',
    'Fresh produce',
    '2.4 tonnes',
    'Jorhat',
    'Imphal Market',
    'AGR-1059',
    'IN TRANSIT',
    'Standard',
    265
  ],

  [
    'DEL-1004',
    'Construction material',
    '18 tonnes',
    'Silchar',
    'Aizawl',
    'CON-5532',
    'DELAYED',
    'Standard',
    310
  ]
];


// ============================================================
// SEED FUNCTION
// ============================================================

async function seed() {

  const client = await pool.connect();

  try {

    console.log('');
    console.log('================================');
    console.log('STARTING DATABASE SEED');
    console.log('================================');
    console.log('');


// ============================================================
// ROADS
// ============================================================

    console.log('Starting roads...');

    for (const r of roads) {

      console.log(`Seeding road: ${r[0]}`);

      const roadValues = [
        r[0],
        r[1],
        r[2],
        r[3],
        r[4],
        r[5],
        r[6],
        r[7],
        r[8],
        r[9],
        r[10],
        JSON.stringify(r[11])
      ];

      await client.query(
        `
        INSERT INTO roads (
          id,
          name,
          district,
          status,
          condition_score,
          traffic_score,
          historical_risk,
          bridge_weight_limit_tons,
          surface_type,
          distance_km,
          base_eta_minutes,
          coords_json
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
        )

        ON CONFLICT (id)

        DO UPDATE SET
          name = EXCLUDED.name,
          district = EXCLUDED.district,
          status = EXCLUDED.status,
          condition_score = EXCLUDED.condition_score,
          traffic_score = EXCLUDED.traffic_score,
          historical_risk = EXCLUDED.historical_risk,
          bridge_weight_limit_tons = EXCLUDED.bridge_weight_limit_tons,
          surface_type = EXCLUDED.surface_type,
          distance_km = EXCLUDED.distance_km,
          base_eta_minutes = EXCLUDED.base_eta_minutes,
          coords_json = EXCLUDED.coords_json
        `,
        roadValues
      );

      console.log(`✓ Road ${r[0]} inserted`);


// ============================================================
// OPTIONAL POSTGIS GEOMETRY
// ============================================================

      try {

        const geometry = {
          type: 'LineString',
          coordinates: r[11].map(point => [
            point[1],
            point[0]
          ])
        };

        await client.query(
          `
          UPDATE roads
          SET geometry =
            ST_SetSRID(
              ST_GeomFromGeoJSON($2),
              4326
            )
          WHERE id = $1
          `,
          [
            r[0],
            JSON.stringify(geometry)
          ]
        );

        console.log(`✓ Geometry added for ${r[0]}`);

      } catch (geometryError) {

        console.log(
          `ℹ PostGIS unavailable for ${r[0]}, skipping geometry`
        );

      }
    }

    console.log('');
    console.log('✓ Finished roads');


// ============================================================
// VEHICLES
// ============================================================

    console.log('');
    console.log('Starting vehicles...');

    for (const v of vehicles) {

      console.log(`Seeding vehicle: ${v[0]}`);

      await client.query(
        `
        INSERT INTO vehicles (
          id,
          vehicle_number,
          cargo,
          status,
          priority,
          route_id,
          route_name,
          latitude,
          longitude,
          progress,
          eta_minutes,
          vehicle_weight_tons
        )

        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
        )

        ON CONFLICT (id)

        DO UPDATE SET
          cargo = EXCLUDED.cargo,
          status = EXCLUDED.status,
          priority = EXCLUDED.priority,
          route_id = EXCLUDED.route_id,
          route_name = EXCLUDED.route_name,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          progress = EXCLUDED.progress,
          eta_minutes = EXCLUDED.eta_minutes,
          vehicle_weight_tons = EXCLUDED.vehicle_weight_tons
        `,
        v
      );

      console.log(`✓ Vehicle ${v[0]} inserted`);
    }

    console.log('');
    console.log('✓ Finished vehicles');


// ============================================================
// WEATHER
// ============================================================

    console.log('');
    console.log('Starting weather...');

    for (const w of weather) {

      console.log(`Seeding weather: ${w[0]}`);

      await client.query(
        `
        INSERT INTO weather_observations (
          district,
          rainfall,
          flood_risk,
          landslide_risk,
          temperature,
          label
        )

        VALUES (
          $1,$2,$3,$4,$5,$6
        )
        `,
        w
      );

      console.log(`✓ Weather ${w[0]} inserted`);
    }

    console.log('');
    console.log('✓ Finished weather');


// ============================================================
// INCIDENTS
// ============================================================

    console.log('');
    console.log('Starting incidents...');

    for (const i of incidents) {

      console.log(`Seeding incident: ${i[0]}`);

      await client.query(
        `
        INSERT INTO incidents (
          title,
          details,
          type,
          severity,
          road_id,
          district,
          latitude,
          longitude,
          verified,
          resolved
        )

        SELECT
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          false,
          false

        WHERE NOT EXISTS (
          SELECT 1
          FROM incidents
          WHERE title = $1
            AND resolved = false
        )
        `,
        i
      );

      console.log(`✓ Incident ${i[0]} processed`);
    }

    console.log('');
    console.log('✓ Finished incidents');


// ============================================================
// DELIVERIES
// ============================================================

    console.log('');
    console.log('Starting deliveries...');

    for (const d of deliveries) {

      console.log(`Seeding delivery: ${d[0]}`);

      await client.query(
        `
        INSERT INTO deliveries (
          id,
          commodity,
          quantity,
          origin,
          destination,
          vehicle_id,
          status,
          priority,
          eta_minutes
        )

        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9
        )

        ON CONFLICT (id)

        DO UPDATE SET
          commodity = EXCLUDED.commodity,
          quantity = EXCLUDED.quantity,
          origin = EXCLUDED.origin,
          destination = EXCLUDED.destination,
          vehicle_id = EXCLUDED.vehicle_id,
          status = EXCLUDED.status,
          priority = EXCLUDED.priority,
          eta_minutes = EXCLUDED.eta_minutes
        `,
        d
      );

      console.log(`✓ Delivery ${d[0]} inserted`);
    }

    console.log('');
    console.log('✓ Finished deliveries');


// ============================================================
// SUCCESS
// ============================================================

    console.log('');
    console.log('================================');
    console.log('SEED DATA INSERTED SUCCESSFULLY');
    console.log('================================');
    console.log('');

  } catch (error) {

    console.error('');
    console.error('================================');
    console.error('SEED FAILED');
    console.error('================================');

    console.error('Message:', error.message);
    console.error('Code:', error.code || 'Unknown');
    console.error('Detail:', error.detail || 'None');
    console.error('Hint:', error.hint || 'None');

    console.error('');

    process.exitCode = 1;

  } finally {

    client.release();

    await pool.end();

  }
}


// ============================================================
// RUN
// ============================================================

seed();