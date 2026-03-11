# Hướng dẫn làm việc nhóm — Git Workflow

## Quy tắc nhánh (Branch)

```
main        ← production (chỉ merge từ develop khi release)
develop     ← nhánh tích hợp chính, mọi người đều làm việc từ đây
feature/*   ← tính năng mới
fix/*       ← sửa bug
```

**Không bao giờ commit thẳng vào `main`.**

---

## Quy trình làm việc hàng ngày

### 1. Bắt đầu task mới

```powershell
git checkout develop
git pull origin develop           # luôn pull trước khi tạo nhánh mới
git checkout -b feature/ten-tinh-nang
```

### 2. Làm việc, commit thường xuyên

```powershell
git add .
git commit -m "feat: mô tả ngắn gọn"
```

### 3. Đẩy lên và tạo Pull Request

```powershell
git push origin feature/ten-tinh-nang
```

Sau đó vào GitHub → **New Pull Request** → base: `develop` ← compare: `feature/ten-tinh-nang`

### 4. Sau khi PR được merge → xóa nhánh cũ

```powershell
git checkout develop
git pull origin develop
git branch -d feature/ten-tinh-nang
```

---

## Quy tắc đặt tên commit

Dùng format: `<type>: <mô tả>`

| Type | Dùng khi |
|---|---|
| `feat` | Thêm tính năng mới |
| `fix` | Sửa bug |
| `refactor` | Sửa code không thay đổi behavior |
| `style` | Thay đổi UI, CSS |
| `chore` | Cập nhật deps, config, gitignore... |
| `docs` | Cập nhật tài liệu |

**Ví dụ:**
```
feat: thêm màn hình kết quả Boss Fight
fix: sửa lỗi energy không trừ khi vào boss
chore: cập nhật requirements.txt
docs: cập nhật README hướng dẫn chạy Docker
```

---

## Quy tắc đặt tên nhánh

| Loại | Format | Ví dụ |
|---|---|---|
| Tính năng | `feature/ten-tinh-nang` | `feature/boss-fight-result` |
| Bug fix | `fix/mo-ta-bug` | `fix/energy-not-deducted` |

Dùng **kebab-case**, **tiếng Anh**, ngắn gọn.

---

## File `.env` — KHÔNG COMMIT

```
frontend/.env          ← gitignored, tự tạo từ .env.example
talki-backend/.env     ← gitignored, tự tạo từ .env.example
```

Lấy giá trị từ **Supabase Dashboard → Settings** (xem README mục 7).

---

## Giải quyết conflict

```powershell
git checkout develop
git pull origin develop
git checkout feature/ten-tinh-nang
git merge develop                  # merge develop vào nhánh của mình để sync
# → giải quyết conflict trong VS Code → git add . → git commit
```

---

## Checklist trước khi tạo Pull Request

- [ ] Code chạy được (không có lỗi đỏ)
- [ ] Không có file `.env` trong commit
- [ ] Tên commit theo đúng format
- [ ] Đã pull `develop` mới nhất và merge vào nhánh của mình
