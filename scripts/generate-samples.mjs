// Sinh dữ liệu mẫu (tổng hợp, có cài bẫy — không phải dữ liệu khách hàng) cho nút "Thử với dữ liệu mẫu"
// Ghi vào public/mau/ ⇒ được phục vụ cùng công cụ khi deploy.
import { writeFileSync, mkdirSync } from "node:fs";
import { buildWorkbookA, buildWorkbookB } from "../tests/fixtures.js";
mkdirSync("public/mau", { recursive: true });
const w = (name, buf) => { writeFileSync("public/mau/" + name, Buffer.from(buf)); console.log("✓ public/mau/" + name); };
w("Du_lieu_mau_tong_hop_2023.xlsx", buildWorkbookA());
w("Du_lieu_mau_2024.xlsx", buildWorkbookB());
