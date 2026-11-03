# Tách quyền xuất bản và ranh giới render Markdown

## Hai ranh giới khác nhau

Ẩn màn hình quản trị không bảo vệ API. Tương tự, chỉ cho ADMIN nhập nội dung không có nghĩa là có thể chèn HTML trực tiếp vào trang đọc. Journal cần kiểm tra quyền ghi ở backend và render nội dung theo cơ chế có thể kiểm chứng.

## Tái sử dụng auth của Brocoders

Trang quản trị dùng `useAuth` và `RoleEnum.ADMIN` của frontend Brocoders. `AdminGate` thích nghi quy tắc giữ account đã xác nhận trên trang từ `useAuthenticatedAccount` của Conduit: chuyển người chưa đăng nhập đến form đăng nhập, nhưng giữ bản nháp đang mở nếu phiên hết hạn. Mỗi endpoint POST, PATCH và DELETE trong controller NestJS dùng `AuthGuard('jwt')` rồi `RolesGuard`. Danh tính tác giả được đọc từ token đã kiểm tra và user repository; tên gửi trong request không được dùng làm tên tác giả.

GET bài và tag được phép công khai. DTO ghi chỉ nhận tiêu đề, tóm tắt, Markdown và tag. Phản hồi đọc dùng article entity chứa tên tác giả dạng snapshot, không join email hoặc mật khẩu từ user entity.

## Giữ cơ chế renderer của Conduit

Nguồn Conduit dùng `react-markdown` để tạo cây React thay vì chuỗi HTML chèn vào DOM. Journal tiếp tục cách này và đặt `skipHtml`. Không bật `rehype-raw`. Liên kết vẫn qua bộ chuyển URL mặc định của renderer.

```tsx
<Markdown skipHtml remarkPlugins={[headingPlugin]}>{body}</Markdown>
```

Mục lục Karhdo được chuyển sang React: desktop có aside sticky, mobile có phần details mở bằng bàn phím. Heading được đọc từ AST remark, vì dùng regex trực tiếp trên Markdown có thể nhận nhầm dòng trong code fence. Bộ tạo slug được khởi tạo lại cho mỗi cây, nên các heading trùng vẫn nhận ID khác nhau và cùng thứ tự ở mục lục/nội dung.

## Kiểm chứng và giới hạn

Suite backend đã kiểm tra anonymous bị 401, người có role USER bị 403 và ADMIN thực hiện được CRUD qua HTTP. Các tình huống này áp dụng cho cả ba phương thức ghi. Kiểm thử gửi tên tác giả giả cũng xác nhận dữ liệu không ghi đè danh tính.

Suite Playwright trong `frontend/playwright-tests/journal/journal.spec.ts` đã chạy tám ca trên desktop/mobile, gồm Markdown có HTML với event handler, URL `javascript:`, code fence, heading trùng và giữ bản nháp khi phiên hết hạn. Điều kiện chạy và giới hạn được ghi ở `docs/verification.md`. Một bài viết không tự thay thế báo cáo kiểm chứng.

JWT dùng ngữ nghĩa hết hạn/refresh của Brocoders. Thay role trong database không bổ sung cơ chế thu hồi tức thì cho access token đã cấp. Nhật ký chưa có upload ảnh hoặc chế độ HTML tùy ý. Các giới hạn này cần được hiểu trước khi xuất bản sản phẩm.
