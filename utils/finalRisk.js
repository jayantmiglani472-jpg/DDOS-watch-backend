// Converts any probability-like input into a safe 0..1 range before we turn it
// into a percentage score for the frontend.
const clampProbability = (value) => {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(1, numeric));
};

// Maps internal ML band names to the exact labels we want to show in the UI.
const bandToDisplayLabel = (band) => {
  if (band === 'high_risk') {
    return 'HIGH RISK';
  }

  if (band === 'monitor') {
    return 'KEEP MONITORING';
  }

  return 'LOW RISK';
};

// Gives the frontend a ready-to-display recommendation so it does not need to
// duplicate decision logic on the client side.
const buildRecommendation = (band) => {
  if (band === 'high_risk') {
    return 'High malicious likelihood. Investigate immediately and block based on policy.';
  }

  if (band === 'monitor') {
    return 'Model confidence is mixed. Keep monitoring and review supporting intelligence.';
  }

  return 'Low immediate risk according to the ML model. Continue routine monitoring.';
};

// If the ML service is temporarily unavailable, we still return a sensible final
// label using the older AbuseIPDB score as a fallback.
const fallbackBandFromAbuseScore = (abuseScore) => {
  const score = Number(abuseScore) || 0;

  if (score >= 70) {
    return 'high_risk';
  }

  if (score >= 40) {
    return 'monitor';
  }

  return 'low_risk';
};

// This is the single place where we convert ML output into the final score/label
// bundle that the frontend dashboard will consume.
const buildFinalRisk = ({ mlProbability, mlBand, abuseScore }) => {
  if (typeof mlProbability === 'number' && mlBand) {
    const safeProbability = clampProbability(mlProbability);

    return {
      finalRiskScore: Math.round(safeProbability * 100),
      finalRiskLabel: bandToDisplayLabel(mlBand),
      finalRecommendation: buildRecommendation(mlBand),
    };
  }

  const fallbackBand = fallbackBandFromAbuseScore(abuseScore);

  return {
    finalRiskScore: Number(abuseScore) || 0,
    finalRiskLabel: bandToDisplayLabel(fallbackBand),
    finalRecommendation: buildRecommendation(fallbackBand),
  };
};

module.exports = { buildFinalRisk };
