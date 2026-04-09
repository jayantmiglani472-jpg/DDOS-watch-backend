# Backend ML Checkpoints

## Checkpoint 1 - Node backend wired for ML service

What changed:
- Added `services/mlService.js` to call the Python ML API using `ML_API_URL`.
- Added `utils/finalRisk.js` to convert ML output into a frontend-friendly final risk score, label, and recommendation.
- Extended the Mongo schema to store ML probability, ML band, thresholds, provider status, display context, and final merged risk fields.
- Added `controllers/ipControllerIntegrated.js` and pointed `routes/ipRoutes.js` to it so the analyzer:
  - keeps the old AbuseIPDB + ipwho flow,
  - calls the ML API in parallel,
  - updates stale cached rows that were created before ML integration,
  - falls back to AbuseIPDB-based final risk if the ML service is temporarily unavailable.
- Added `GET /health` in `server.js` for backend health checks.

Why this design:
- The backend remains the orchestration layer.
- The Python service stays responsible only for feature-building and model inference.
- The frontend can keep using one backend response instead of calling multiple services directly.

New backend environment variable:
- `ML_API_URL=http://localhost:8000`

What has not been changed yet:
- Frontend UI is still untouched.
- No deployment configuration has been changed yet.
- Backend-to-ML integration still needs local endpoint testing before frontend wiring.

Note:
- The original `controllers/ipController.js` is intentionally left in place as a reference snapshot.

## Checkpoint 2 - Local backend + ML integration test passed

Verified locally:
- Python ML service was running on `http://localhost:8000`.
- Backend called the ML service successfully while also fetching AbuseIPDB and ipwho data.
- `GET /api/analyze-ip/8.8.8.8` returned a merged response containing:
  - old backend fields such as `abuseScore`, `country`, `isp`, `usageType`
  - ML fields such as `mlMaliciousProbability`, `mlRiskBand`, thresholds, provider status, and display context
  - final UI-ready fields `finalRiskScore`, `finalRiskLabel`, and `finalRecommendation`

What this proves:
- The Node backend is now acting as the orchestration layer correctly.
- The Python ML API is reachable from the backend.
- MongoDB can now store both legacy enrichment fields and new ML fields together.

## Checkpoint 3 - Consistency and resilience fixes applied

What changed:
- `utils/finalRisk.js` was updated so backend `finalRiskScore`, `finalRiskLabel`, and `finalRecommendation` now follow the same AbuseIPDB-first logic that the frontend shows.
- `controllers/ipControllerIntegrated.js` now uses Node's built-in IP parser instead of the old loose IPv4/IPv6 regex checks.
- `controllers/ipController.js` was updated with the same stronger IP validation so the legacy controller is no longer looser than the integrated one.
- `controllers/globalController.js` now uses per-request Cloudflare auth headers and `Promise.allSettled()` so one failed Radar endpoint does not automatically break the whole dashboard response.

Why this matters:
- The backend JSON, database fields, and dashboard UI now agree on what "final risk" means.
- Invalid IP strings are less likely to slip through frontend/backend validation mismatches.
- The global dashboard is more tolerant of partial Cloudflare API failures.
