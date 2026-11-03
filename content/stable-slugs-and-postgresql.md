# Giữ URL bài viết ổn định khi chuyển Conduit sang TypeORM

## Bài toán

Quan Dev Journal cần một URL có thể dùng trong portfolio và chia sẻ lâu dài. Bản Conduit được chọn tạo slug từ tiêu đề và có thể đổi slug khi đổi tiêu đề. Yêu cầu của Journal là giữ URL sau thao tác sửa.

## Phần tái sử dụng

`backend/src/articles/slug.ts` lấy từ Conduit revision `dd44cb7196afa15344fd96445d190affb6d82cee`. Giá trị slug phân tách chữ thường, dấu nối và dấu phụ Unicode. Nếu không còn ký tự ASCII phù hợp, mã nguồn dùng `article`. Phần xử lý slug trùng dựa trên repository Prisma của cùng nguồn.

Journal dùng TypeORM và migration của Brocoders. Tôi chuyển vòng thử insert và nhận lỗi constraint sang `QueryFailedError`: chỉ mã PostgreSQL `23505` ở constraint `UQ_article_slug` mới được thử lại. Một lỗi database khác phải được trả về thay vì bị hiểu nhầm thành trùng slug.

## Vì sao không kiểm tra trước bằng SELECT?

Hai request đồng thời có thể cùng thấy slug chưa tồn tại. Constraint UNIQUE quyết định kết quả ngay tại thao tác ghi. Request thất bại thử hậu tố từ slug gốc: `title`, `title-2`, `title-3`. Vòng thử giới hạn 50 lần theo nguồn Conduit.

```ts
const candidate = attempt === 1 ? base : base.withSuffix(attempt);
```

Đổi tiêu đề qua PATCH chỉ thay các trường DTO được phép. Slug, tên tác giả và thời điểm tạo không thuộc DTO cập nhật; vì vậy đường dẫn không đổi. Tag mới thay danh sách tag cũ và được khử trùng.

## Bằng chứng đã chạy

`backend/test/articles.e2e-spec.ts` đăng nhập qua HTTP thật và chạy trên PostgreSQL riêng. Kiểm thử tạo bốn bài có tiêu đề giống nhau đồng thời và xác nhận bốn slug khác nhau. Một kiểm thử khác sửa tiêu đề, đọc lại qua slug cũ rồi xóa bài và nhận 404. Cùng suite kiểm tra tìm kiếm literal, tag, phân trang và migration lên–xuống–lên.

Lệnh: `cd backend && npm run test:journal`. Database kiểm thử bắt buộc có hậu tố `_journal_test`; suite có thao tác reset fixture và không dành cho dữ liệu thật.

## Giới hạn

Đây là kiểm thử hành vi trong môi trường phát triển, không phải bằng chứng chịu tải production. Pagination dùng offset và thứ tự thời gian/ID; bài mới được đăng giữa hai lần đọc có thể dịch vị trí các trang. Không có số liệu lưu lượng hay cam kết hiệu năng trong bài này.
