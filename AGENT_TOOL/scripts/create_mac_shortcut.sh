#!/bin/bash

# Thư mục Desktop của người dùng
DESKTOP_DIR="$HOME/Desktop"
APP_NAME="AutoPoster.app"
APP_DIR="$DESKTOP_DIR/$APP_NAME"

echo "==================================================="
# Thiết lập UTF-8 để hiển thị tiếng Việt chính xác trên Mac Terminal
export LANG=en_US.UTF-8

echo "🚀 Đang tiến hành tạo Shortcut ứng dụng trên macOS Desktop..."
echo "==================================================="

# 1. Tạo cấu trúc thư mục App Bundle của macOS
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

# 2. Tạo tệp cấu hình Info.plist
cat <<EOF > "$APP_DIR/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>AutoPoster</string>
    <key>CFBundleIconFile</key>
    <string>icon</string>
    <key>CFBundleIdentifier</key>
    <string>com.autoposter.app</string>
    <key>CFBundleName</key>
    <string>AutoPoster</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.10</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

# 3. Tạo tập lệnh thực thi chính bên trong App Bundle
# Đoạn mã dưới sẽ tự động tìm đường dẫn chứa thư mục dự án thực tế và chạy tệp StartApp.command
PROJECT_PATH="$(cd "$(dirname "$0")/.." && pwd)"

cat <<EOF > "$APP_DIR/Contents/MacOS/AutoPoster"
#!/bin/bash
# Cấp quyền cho tệp khởi động
chmod +x "$PROJECT_PATH/StartApp.command"

# Chạy tệp khởi động ẩn hoàn toàn trong nền bằng AppleScript (không hiện cửa sổ Terminal)
osascript -e 'do shell script "cd \"$PROJECT_PATH\" && ./StartApp.command > /dev/null 2>&1 &"'
EOF

# 4. Cấp quyền thực thi cho các tệp lệnh
chmod +x "$APP_DIR/Contents/MacOS/AutoPoster"

# 5. Thiết lập quyền chạy tệp StartApp.command gốc
chmod +x "$PROJECT_PATH/StartApp.command"

echo ""
echo "🎉 HOÀN TẤT: Đã tạo thành công lối tắt '$APP_NAME' trên Desktop!"
echo "👉 Bây giờ bạn chỉ cần ra màn hình Desktop trên Mac, Click đúp vào biểu tượng ứng dụng 'AutoPoster' để khởi chạy phần mềm bất cứ lúc nào."
echo "==================================================="
