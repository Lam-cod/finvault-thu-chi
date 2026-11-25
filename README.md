# FinVault — Ứng Dụng Web Quản Lý Thu Chi Cá Nhân

Ứng dụng quản lý tài chính cá nhân hiện đại chạy cục bộ trên máy tính, lưu trữ dữ liệu bền vững bằng SQLite tích hợp sẵn trong Node.js (không cần cài đặt CSDL rời).

## Yêu cầu hệ thống
- **Node.js v22.5 trở lên** (khuyến nghị **Node.js v24 LTS** — tải tại [nodejs.org](https://nodejs.org/)) vì sử dụng module tích hợp sẵn `node:sqlite`.
- **Git** để clone mã nguồn về máy mới.

---

## Hướng dẫn cài đặt & chạy trên máy khác

### Cách 1: Chạy nhanh 1-click trên Windows
1. Clone repository về máy:
   ```bash
   git clone https://github.com/Lam-cod/finvault-thu-chi.git
   cd finvault-thu-chi
   ```
2. Nhấp đúp file **`start-web.bat`** — script sẽ tự động cài đặt `node_modules` (nếu chưa có), build ứng dụng, mở trình duyệt tại `http://localhost:3456` và khởi chạy server.

### Cách 2: Chạy bằng Terminal (Windows / macOS / Linux)
```bash
git clone https://github.com/Lam-cod/finvault-thu-chi.git
cd finvault-thu-chi
npm install
npm run build
npm start
```
Sau đó mở trình duyệt truy cập: **http://localhost:3456**

### Chế độ lập trình (Dev mode)
```bash
npm run dev
```

---

## Tính năng chính
- **Tổng quan & Biểu đồ**: KPI tài sản ròng, thu/chi tháng, dòng tiền ròng, biểu đồ thu chi theo ngày & 6 tháng, cơ cấu chi tiêu, phân tích thông minh.
- **Ghi giao dịch nhanh (phím tắt `N`)**: Chi tiêu, Thu nhập, Chuyển ví; gợi ý mệnh giá VNĐ thông minh; tự động cập nhật số dư ví.
- **Sổ giao dịch**: Tìm kiếm, lọc theo ví/danh mục/loại/tháng và xuất file **Excel (CSV UTF-8 BOM)**.
- **Ngân sách & Hũ tiết kiệm**: Đặt hạn mức chi tiêu theo tháng, theo dõi đa ví và mục tiêu tiết kiệm.
- **Lịch thu chi & Sao lưu dữ liệu**: Bản đồ nhiệt chi tiêu theo ngày, sao lưu/khôi phục toàn bộ dữ liệu qua file `.json` hoặc xoá dữ liệu mẫu để bắt đầu sổ mới.

## Đồng bộ dữ liệu giữa các máy
Dữ liệu SQLite cá nhân (`data/finance.db`) được bỏ qua trong `.gitignore` để bảo mật và tránh xung đột. Khi chuyển sang máy mới:
1. Ở máy cũ: vào mục **Lịch & Dữ liệu** → bấm **Sao lưu toàn bộ (.JSON)**.
2. Ở máy mới: vào mục **Lịch & Dữ liệu** → bấm **Khôi phục (.JSON)** và chọn file vừa tải về.
