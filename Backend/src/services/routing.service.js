const { calculateRisk } = require('./risk.service');

function scoreRoute(route, priority) {
  if (route.blocked) return Infinity;
  const riskPenalty = route.riskScore * 5;
  const timePenalty = route.etaMinutes * (priority === 'Critical' ? 1.2 : 0.8);
  const distancePenalty = route.distanceKm * 0.25;
  return riskPenalty + timePenalty + distancePenalty;
}

function buildRouteOptions({ road, weather, vehicleWeightTons = 10, cargoType = 'GENERAL', priority = 'Standard' }) {
  const mainRisk = calculateRisk({
    rainfall: weather.rainfall,
    floodRisk: weather.flood_risk,
    landslideRisk: weather.landslide_risk,
    roadCondition: road.condition_score,
    traffic: road.traffic_score,
    historicalIncidents: road.historical_risk
  });

  const alternativeRisk = calculateRisk({
    rainfall: weather.rainfall * 0.65,
    floodRisk: weather.flood_risk * 0.55,
    landslideRisk: weather.landslide_risk * 0.45,
    roadCondition: 28,
    traffic: 30,
    historicalIncidents: 24
  });

  const emergencyRisk = calculateRisk({
    rainfall: weather.rainfall * 0.30,
    floodRisk: weather.flood_risk * 0.25,
    landslideRisk: weather.landslide_risk * 0.20,
    roadCondition: 12,
    traffic: 15,
    historicalIncidents: 10
  });

  const bridgeBlocked = road.bridge_weight_limit_tons != null && vehicleWeightTons > road.bridge_weight_limit_tons;
  const mainBlocked = road.status === 'BLOCKED' || bridgeBlocked;

  const routes = [
    {
      id: 'A', name: 'Route A · Bomdila corridor', distanceKm: road.distance_km || 442,
      etaMinutes: (road.base_eta_minutes || 680) + (mainBlocked ? 999 : mainRisk.riskScore * 2),
      riskScore: mainRisk.riskScore, riskLevel: mainRisk.riskLevel, blocked: mainBlocked,
      routeId: road.id, reason: mainBlocked ? (bridgeBlocked ? 'Vehicle exceeds bridge weight limit.' : 'Road is blocked.') : mainRisk.recommendedAction
    },
    {
      id: 'B', name: 'Route B · Tezpur diversion', distanceKm: 486,
      etaMinutes: 725 + alternativeRisk.riskScore, riskScore: alternativeRisk.riskScore,
      riskLevel: alternativeRisk.riskLevel, blocked: false, routeId: 'ALT-1',
      reason: alternativeRisk.recommendedAction
    },
    {
      id: 'C', name: 'Route C · Emergency air transfer', distanceKm: 125,
      etaMinutes: mainRisk.riskScore > 82 ? 105 : 155, riskScore: emergencyRisk.riskScore,
      riskLevel: emergencyRisk.riskLevel, blocked: false, routeId: 'AIR',
      reason: cargoType.toUpperCase() === 'MEDICAL' || priority === 'Critical' ? 'Fast emergency option.' : 'Use only for high-priority cargo.'
    }
  ];

  routes.forEach(r => { r.totalScore = scoreRoute(r, priority); });
  const available = routes.filter(r => Number.isFinite(r.totalScore));
  const recommended = available.sort((a, b) => a.totalScore - b.totalScore)[0] || routes[1];

  return {
    recommendedRoute: recommended.id,
    routes: routes.map(({ totalScore, ...r }) => r)
  };
}

module.exports = { buildRouteOptions };
