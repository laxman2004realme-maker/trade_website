#!/bin/bash
# Quick setup script for NSE Dashboard

echo "Installing dependencies..."
npm install

echo "Adding backend dependencies..."
npm install express cors dotenv

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env.local and fill in your credentials:"
echo "   cp .env.example .env.local"
echo ""
echo "2. Run the frontend:"
echo "   npm run dev"
echo ""
echo "3. (Optional) In another terminal, run the backend:"
echo "   node server.js"
echo ""
echo "Frontend will be available at: http://localhost:5173"
echo "Backend will be available at: http://localhost:5000"
