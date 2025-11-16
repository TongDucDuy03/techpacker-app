# Hướng dẫn quy trình tạo tài khoản, phân quyền và đăng nhập ứng dụng TechPacker

## 1. Tạo tài khoản người dùng

- Người dùng mới có thể đăng ký tài khoản thông qua giao diện đăng ký của ứng dụng.
- Khi đăng ký, người dùng cần cung cấp các thông tin cơ bản như họ tên, email, mật khẩu và vai trò (role) nếu được phép lựa chọn.
- Sau khi đăng ký, hệ thống sẽ kiểm tra email có hợp lệ và chưa tồn tại trong hệ thống.
- Tài khoản mới sẽ được lưu vào cơ sở dữ liệu và có trạng thái hoạt động (active) mặc định.

## 2. Phân quyền người dùng

- Ứng dụng TechPacker hỗ trợ nhiều vai trò người dùng như: Admin, Designer, Viewer, Merchandiser, Factory,...
- Quyền hạn của từng vai trò được xác định rõ ràng:
  - **Admin**: Quản lý toàn bộ hệ thống, có quyền tạo, chỉnh sửa, xóa mọi TechPack và người dùng.
  - **Designer**: Tạo và chỉnh sửa TechPack do mình tạo hoặc được chia sẻ.
  - **Viewer**: Chỉ xem TechPack được chia sẻ, không có quyền chỉnh sửa.
  - **Merchandiser**: Quản lý TechPack liên quan đến sản xuất, có quyền hạn nhất định.
  - **Factory**: Xem thông tin sản xuất, không chỉnh sửa.
- Việc phân quyền được thực hiện khi tạo tài khoản hoặc do Admin chỉnh sửa thông tin người dùng.

## 3. Đăng nhập vào hệ thống

- Người dùng đăng nhập bằng email và mật khẩu đã đăng ký.
- Hệ thống xác thực thông tin đăng nhập, nếu đúng sẽ cấp quyền truy cập theo vai trò đã phân công.
- Sau khi đăng nhập, người dùng sẽ thấy các chức năng phù hợp với quyền hạn của mình.
- Nếu đăng nhập thất bại, hệ thống sẽ thông báo lỗi và yêu cầu kiểm tra lại thông tin.

## 4. Lưu ý bảo mật

- Mật khẩu người dùng được mã hóa trước khi lưu vào cơ sở dữ liệu.
- Hệ thống sử dụng xác thực phiên làm việc (session) hoặc token để bảo vệ truy cập.
- Admin có thể khóa hoặc xóa tài khoản người dùng khi cần thiết.

## 5. Quy trình quản lý tài khoản

- Admin có thể xem danh sách người dùng, chỉnh sửa vai trò, trạng thái hoạt động hoặc xóa tài khoản.
- Người dùng có thể cập nhật thông tin cá nhân và đổi mật khẩu khi cần.

---

**Lưu ý:** Quy trình trên đảm bảo người dùng được phân quyền rõ ràng, bảo mật thông tin và truy cập đúng chức năng theo vai trò trong ứng dụng TechPacker.