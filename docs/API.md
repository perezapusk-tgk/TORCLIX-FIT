# TORCLIX FIT API v0.2

POST /api/auth/telegram — validates Telegram Mini App initData.
GET /api/today — current NEXT MOVE.
GET /api/fitness-twin — Fitness Twin metrics.
POST /api/workouts/sessions — starts a workout.
POST /api/workouts/sessions/:id/sets — saves a set.
GET /health — service health.

Production: add timestamp validation, rate limiting, persistent sessions and a database-backed user model.