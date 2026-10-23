# TORCLIX FIT — Technical Architecture

## Frontend
Vite + React, optimized for Telegram Mini App viewport and touch interaction.

## Backend target
Node.js API + PostgreSQL.

## Core domains
- auth
- users
- goals
- training
- exercises
- workout sessions
- body measurements
- recovery
- nutrition
- missions
- squads
- subscriptions
- referrals
- notifications
- AI decisions

## AI safety boundary
AI should reason over structured facts and deterministic fitness rules. It must not invent user metrics. Health/medical diagnosis is out of scope.

## Telegram
- Bot as entry point
- Mini App as main product
- Telegram identity/session
- notifications
- digital subscription flow compliant with Telegram Stars requirements

## Analytics
Track acquisition, onboarding completion, first NEXT MOVE, completed NEXT MOVE, D1/D7/D30 retention, workout frequency, conversion, churn and referral rate.
