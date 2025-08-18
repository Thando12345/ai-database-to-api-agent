@echo off
echo 📞 Setting up AI Database Agent Call Functionality
echo.

echo Installing required dependencies...
npm install twilio cors dotenv socket.io

echo.
echo ✅ Dependencies installed!
echo.
echo 📋 Next steps to enable real calls:
echo.
echo 1. Sign up for Twilio account at https://www.twilio.com
echo 2. Get your Account SID, Auth Token, and Phone Number
echo 3. Update .env file with your Twilio credentials:
echo    TWILIO_SID=your_account_sid
echo    TWILIO_AUTH_TOKEN=your_auth_token  
echo    TWILIO_PHONE_NUMBER=your_twilio_number
echo    BASE_URL=http://localhost:3000
echo.
echo 4. For production, set BASE_URL to your public domain
echo 5. Configure Twilio webhook URLs in your Twilio console
echo.
echo 🚀 Start the server with: npm start
echo 📞 Test calls will work in simulation mode without Twilio
echo.
pause