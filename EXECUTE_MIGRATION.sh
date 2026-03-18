#!/bin/bash

# =====================================================
# NEON DATABASE MIGRATION - ONE-CLICK EXECUTION
# =====================================================

set -e

echo "🚀 Installing dependencies..."
npm install ws --silent

echo ""
echo "🚀 Running database migration..."
echo ""

node migrate.js

echo ""
echo "✅ Done! Check the output above for results."
