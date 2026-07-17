const { MongoClient } = require('mongodb');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tiktok_agent';

async function main() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const bugs = await db.collection('diagnostics').find({ status: 'unresolved' }).toArray();
    
    if (bugs.length === 0) {
      console.log('🎉 Tuyệt vời! Không phát hiện lỗi hệ thống (unresolved) nào.');
      return;
    }
    
    console.log(`\n=============================================================`);
    console.log(`🔔 PHÁT HIỆN HỆ THỐNG ĐANG CÓ ${bugs.length} LỖI CHƯA ĐƯỢC KHẮC PHỤC`);
    console.log(`=============================================================\n`);
    
    bugs.forEach((bug, index) => {
      console.log(`[Lỗi #${index + 1}] ID: ${bug.id}`);
      console.log(`📂 File bị lỗi: ${bug.filePath}`);
      console.log(`🏷️ Phân loại: ${bug.errorType}`);
      console.log(`📝 Thông điệp: ${bug.message}`);
      console.log(`⏰ Thời gian: ${bug.createdAt}`);
      console.log(`📊 Bối cảnh (Context):`, bug.context);
      if (bug.stack) {
        console.log(`📌 Chi tiết lỗi (5 dòng đầu):`);
        console.log(bug.stack.split('\n').slice(0, 5).join('\n'));
      }
      console.log(`\n👉 ĐỂ SỬA LỖI NÀY, HÃY KÍCH HOẠT CHẾ ĐỘ TỰ FIX CỦA AI BẰNG CÁCH YÊU CẦU:`);
      console.log(`   "Sửa lỗi hệ thống với ID: ${bug.id}"`);
      console.log(`=============================================================\n`);
    });
  } catch (err) {
    console.error('Không thể kết nối MongoDB:', err.message);
  } finally {
    await client.close();
  }
}

main();
