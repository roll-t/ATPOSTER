/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  devIndicators: false,
  onDemandEntries: {
    // Thời gian giữ trang không hoạt động trong buffer (60s)
    maxInactiveAge: 60 * 1000,
    // Số trang tối đa giữ đồng thời trong bộ nhớ
    pagesBufferLength: 2,
  },
};

export default nextConfig;
