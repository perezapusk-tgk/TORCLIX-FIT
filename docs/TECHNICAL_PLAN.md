# TORCLIX FIT — Technical Plan

## Architecture
Telegram → Mini App → API → Auth → Domain services → Data layer → AI layer

## Domain services
identity/profile
goals
training
recovery
nutrition
progress
missions
squads
subscriptions

## Decision pipeline
1. Validate available data.
2. Calculate deterministic metrics and constraints.
3. Select candidate actions.
4. Apply goal and schedule constraints.
5. Use AI for explanation and personalization, not fabricated facts.
6. Persist decision and reason codes.
7. Capture outcome for the next decision.

## Initial API
GET /health
GET /me
GET /today
POST /onboarding
POST /workouts/sessions
POST /workouts/sessions/:id/sets
POST /today/complete
GET /progress
GET /fitness-twin
GET /missions
