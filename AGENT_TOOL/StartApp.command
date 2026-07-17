#!/bin/bash
cd "$(dirname "$0")"

echo "==================================================="
echo "     He Thong AutoPoster YouTube Shorts (macOS)"
echo "==================================================="
echo ""

# Thư mục chứa file splash
SPLASH_PATH="$(pwd)/data/splash.html"

# Kiem tra xem cong 3000 da co server chay chua
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "Server dang chay san. Dang mo giao dien..."
    open -a "Google Chrome" --args --app="http://localhost:3000" || open -a "Microsoft Edge" --args --app="http://localhost:3000" || open "http://localhost:3000"
    exit 0
fi

echo "Dang khoi dong Server. Vui long doi vai giay..."
echo "De tat hoan toan phan mem, hay DONG CUA SO NAY lai."
echo ""

# Mo ngay lap tuc Splash Screen
open -a "Google Chrome" --args --app="file://$SPLASH_PATH" || open -a "Microsoft Edge" --args --app="file://$SPLASH_PATH" || open "file://$SPLASH_PATH"

# Chay server Next.js
npm run dev
