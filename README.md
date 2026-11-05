# Nhà Mộc: cửa hàng online (Next.js + Supabase + Vercel)

Gồm trang cửa hàng (tìm kiếm, lọc, giỏ hàng, đặt hàng COD) và trang `/admin` (đăng nhập, thêm/sửa/xóa sản phẩm kèm tải ảnh, quản lý đơn hàng). Chỉ tài khoản nằm trong bảng `admins` mới ghi được dữ liệu; điều này được khóa ở cơ sở dữ liệu (RLS), không chỉ ở giao diện.

Tên menu trên Supabase/Vercel có thể thay đổi đôi chút theo thời gian.

## Chuẩn bị
Node.js 20 trở lên, tài khoản GitHub, Supabase, Vercel (đều có gói miễn phí).

## 1. Tạo cơ sở dữ liệu (Supabase)
1. Vào supabase.com, chọn **New project**, đặt tên và mật khẩu cơ sở dữ liệu, chọn vùng gần Việt Nam (ví dụ Singapore).
2. Mở **SQL Editor**, dán toàn bộ `supabase/schema.sql`, bấm **Run**. Bước này tạo bảng, chính sách bảo mật, kho ảnh `product-images` và 4 sản phẩm mẫu.
3. Vào **Project Settings > API**, chép **Project URL** và khóa **anon public**.

## 2. Tạo tài khoản admin
1. Vào **Authentication > Users > Add user**, nhập email và mật khẩu của bạn, chọn tự xác nhận email.
2. Trong **SQL Editor** chạy (thay email của bạn):
```sql
insert into admins (user_id) select id from auth.users where email = 'email-cua-ban@example.com';
```
3. Vào **Authentication** (phần cài đặt đăng nhập bằng Email) và tắt cho phép người lạ tự đăng ký. Dù họ có đăng ký cũng không ghi được dữ liệu, nhưng nên tắt cho gọn.

## 3. Chạy thử trên máy
```bash
cp .env.example .env.local     # điền URL và anon key vừa chép
npm install
npm run dev                    # mở http://localhost:3000 và http://localhost:3000/admin
```

## 4. Đưa lên GitHub
Tạo repo mới (để Private cũng được), rồi:
```bash
git init && git add . && git commit -m "Nhà Mộc shop"
git branch -M main
git remote add origin https://github.com/TEN-BAN/nha-moc-shop.git
git push -u origin main
```
Tệp `.env.local` đã nằm trong `.gitignore`, sẽ không bị đẩy lên.

## 5. Đưa lên mạng (Vercel)
1. Vào vercel.com, chọn **Add New > Project**, chọn repo vừa tạo.
2. Ở **Environment Variables** thêm `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` (cùng giá trị như `.env.local`).
3. Bấm **Deploy**. Sau vài phút bạn có địa chỉ dạng `ten-du-an.vercel.app`. Từ nay mỗi lần `git push` trang tự cập nhật.
4. Tên miền riêng: **Settings > Domains** trên Vercel, thêm tên miền và làm theo hướng dẫn trỏ DNS.

## 6. Sử dụng
- Vào `/admin`, đăng nhập. Tab **Sản phẩm**: thêm mới, chọn ảnh từ máy (ảnh nên nén dưới 500KB), sửa, xóa, bỏ tick "Còn hàng" để ẩn. Tab **Đơn hàng**: xem và đổi trạng thái.
- Nên thay 4 sản phẩm mẫu bằng sản phẩm thật. Ảnh được lưu ở Supabase Storage.

## Lưu ý
- Khóa anon công khai là bình thường vì RLS bảo vệ dữ liệu. Tuyệt đối không dùng khóa `service_role` trong mã hay đẩy lên GitHub.
- Tổng tiền đơn được tính ở trình duyệt, nên hãy đối chiếu giá khi gọi xác nhận đơn. Muốn chặt hơn, chuyển bước đặt hàng sang một hàm phía máy chủ.
- Dự án miễn phí của Supabase có thể bị tạm dừng nếu lâu không có hoạt động; vào bảng điều khiển để bật lại.
- Chưa có: thanh toán trực tuyến (VNPay, MoMo, PayOS), email thông báo đơn, tài khoản khách hàng, quản lý danh mục riêng.
