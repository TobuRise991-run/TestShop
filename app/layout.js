import "./globals.css";
import { Be_Vietnam_Pro } from "next/font/google";
const font = Be_Vietnam_Pro({ subsets: ["vietnamese", "latin"], weight: ["400", "500", "600", "800"] });
export const metadata = { title: "Nhà Mộc – Đồ gia dụng thủ công", description: "Gốm, gỗ, vải lanh từ các làng nghề Việt Nam." };
export const viewport = { width: "device-width", initialScale: 1 };
export default function RootLayout({ children }) {
  return (<html lang="vi"><body className={font.className}>{children}</body></html>);
}
