function clamp(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function level(score) {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 30) return 'MODERATE';
  return 'LOW';
}

function calculateRisk({ rainfall, floodRisk, landslideRisk, roadCondition, traffic, historicalIncidents }) {
  const score = Math.round(
    clamp(rainfall) * 0.20 +
    clamp(floodRisk) * 0.20 +
    clamp(landslideRisk) * 0.25 +
    clamp(roadCondition) * 0.15 +
    clamp(traffic) * 0.10 +
    clamp(historicalIncidents) * 0.10
  );

  return {
    riskScore: Math.min(100, score),
    riskLevel: level(score),
    confidence: Math.max(61, 96 - Math.round(score * 0.25)),
    explanation: 'Weighted prototype assessment: rainfall 20%, flood 20%, landslide 25%, road condition 15%, traffic 10%, historical incidents 10%.',
    recommendedAction: score > 74
      ? 'Avoid corridor and use alternate route.'
      : score > 45
        ? 'Use with monitoring and delivery buffer.'
        : 'Proceed with routine monitoring.'
  };
}

module.exports = { calculateRisk };
