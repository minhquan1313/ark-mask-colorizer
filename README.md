# ARK Mask Colorizer (Vite + React)

App mẫu cho phép chọn 6 slot màu (0–5) theo **bảng màu ARK (1..254, 255 = undefined)**, sau đó tô màu lại ảnh đầu ra dựa trên **ảnh base** và **ảnh mask** (mask mã hoá bằng 6 màu: Red, Green, Blue, Cyan, Yellow, Magenta).

## Chạy thử

```bash
npm i
npm run dev
```

Mặc định dùng ảnh mẫu trong `public/assets`:
- `base.png` – Drakeling
- `mask.png` – mask màu 6 vùng

Bạn có thể **Tải Base…** / **Tải Mask…** để thay ảnh của riêng bạn.

## Cách hoạt động

- `src/utils/colorize.js`: xử lý pixel bằng Canvas API. Với mỗi pixel, kiểm tra pixel của **mask** thuộc slot nào (so sánh màu gần nhất với 6 màu khóa). Nếu thuộc slot X, lấy màu ARK đã chọn cho slot X và **nhuộm** lên pixel gốc, giữ nguyên độ sáng (luminance) để bảo toàn shading.
- `src/components/PaletteGrid.jsx`: hiển thị lưới 1..254 từ `src/utils/arkPalette.js` (được trích tự động từ ảnh bảng màu).
- `src/components/SlotPicker.jsx`: chọn nhanh chỉ số (1..255). 255 = undefined (bỏ qua slot).

## Tham số

- **Threshold**: độ “chặt” khi khớp màu mask (mặc định 80). Tăng nếu mask bị rò sang vùng lân cận.
- **Strength**: mức pha trộn màu mới với ảnh gốc (0..1).

## Thư mục

```
ark-mask-colorizer/
  public/assets/
    base.png
    mask.png
  src/
    components/
      PaletteGrid.jsx
      SlotPicker.jsx
    utils/
      arkPalette.js
      colorize.js
      color.js
    App.jsx
    main.jsx
  index.html
  package.json
```

## Ghi chú
- Bảng màu ARK trong `arkPalette.js` gồm 254 màu đầu, màu 255 là `undefined`.
- Nếu muốn đổi blend, bạn có thể thay đoạn trong `colorize.js` (ví dụ chuyển qua chế độ Multiply/Overlay/HSL).
