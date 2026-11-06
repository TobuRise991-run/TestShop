"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase, fmt } from "../lib/supabase";
import "./account.css";

const FREE = 500000;
// Khách đăng ký chỉ bằng tên đăng nhập; hệ thống tạo email nội bộ từ tên này (không gửi thư).
// Hãy đổi thành tên miền của bạn nếu Supabase báo email không hợp lệ.
const USER_DOMAIN = "khach.nhamoc.vn";
const toEmail = (u) => (u.includes("@") ? u : u + "@" + USER_DOMAIN);
const okName = (u) => /^[a-z0-9._-]{3,24}$/.test(u);
const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
  </svg>
);

export default function Home() {
  const [products, setProducts] = useState(null);
  const [cat, setCat] = useState("Tất cả");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("new");
  const [cart, setCart] = useState({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", note: "" });
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  // tài khoản
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false); // false | "login" | "signup"
  const [af, setAf] = useState({ user: "", email: "", pw: "" });
  const [authMsg, setAuthMsg] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    supabase.from("products").select("*").eq("in_stock", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => setProducts(data || []));
    try { setCart(JSON.parse(localStorage.getItem("cart") || "{}")); } catch {}
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => { try { localStorage.setItem("cart", JSON.stringify(cart)); } catch {} }, [cart]);
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") { setAuthOpen(false); setMenuOpen(false); setOpen(false); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const cats = useMemo(() => ["Tất cả", ...new Set((products || []).map((p) => p.category))], [products]);
  const list = useMemo(() => {
    let l = (products || []).filter((p) =>
      (cat === "Tất cả" || p.category === cat) && p.name.toLowerCase().includes(q.trim().toLowerCase()));
    if (sort === "asc") l = [...l].sort((a, b) => a.price - b.price);
    if (sort === "desc") l = [...l].sort((a, b) => b.price - a.price);
    return l;
  }, [products, cat, q, sort]);

  const lines = Object.entries(cart)
    .map(([id, n]) => ({ p: (products || []).find((x) => x.id === id), n })).filter((l) => l.p);
  const count = lines.reduce((a, l) => a + l.n, 0);
  const total = lines.reduce((a, l) => a + l.n * l.p.price, 0);
  const set = (id, n) => setCart((c) => { const x = { ...c }; if (n < 1) delete x[id]; else x[id] = n; return x; });

  async function order(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const items = lines.map((l) => ({ id: l.p.id, name: l.p.name, price: l.p.price, qty: l.n }));
    const { error } = await supabase.from("orders").insert({
      customer_name: form.name, phone: form.phone, address: form.address, note: form.note || null, items, total,
    });
    setBusy(false);
    if (error) return setMsg({ err: true, t: "Không đặt được hàng. Vui lòng thử lại." });
    setCart({});
    setMsg({ t: "Đặt hàng thành công. Chúng tôi sẽ gọi xác nhận sớm." });
  }

  const closeAuth = () => { setAuthOpen(false); setAuthMsg(null); setAf({ user: "", email: "", pw: "" }); };
  async function submitAuth(e) {
    e.preventDefault(); setAuthBusy(true); setAuthMsg(null);
    const u = af.user.trim().toLowerCase();
    if (authOpen === "signup" && !okName(u)) {
      setAuthBusy(false);
      return setAuthMsg({ err: true, t: "Tên đăng nhập gồm 3 đến 24 ký tự: chữ thường không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang." });
    }
    if (authOpen === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: toEmail(u), password: af.pw });
      setAuthBusy(false);
      if (error) return setAuthMsg({ err: true, t: "Sai tên đăng nhập hoặc mật khẩu." });
      closeAuth();
    } else {
      const { data, error } = await supabase.auth.signUp({ email: toEmail(u), password: af.pw, options: { data: { username: u } } });
      setAuthBusy(false);
      if (error) return setAuthMsg({ err: true, t: /registered|exists/i.test(error.message)
        ? "Tên đăng nhập này đã có người dùng." : "Không tạo được tài khoản: " + error.message });
      if (data.session) closeAuth();
      else setAuthMsg({ err: true, t: "Tài khoản đã tạo nhưng đang bắt xác nhận email. Hãy tắt Confirm email trong Supabase." });
    }
  }
  const display = user?.user_metadata?.username || (user?.email || "").split("@")[0];

  return (
    <>
      <header><div className="wrap bar">
        <a className="logo" href="/">Nhà Mộc</a>
        <button className="btn ghost" onClick={() => setOpen(true)}>Giỏ hàng<span className="badge">{count}</span></button>
        <div className="acct">
          {user ? (
            <>
              <button className="avatar" onClick={() => setMenuOpen((o) => !o)} aria-label="Tài khoản" aria-expanded={menuOpen}>
                {(display || user.email || "?")[0].toUpperCase()}
              </button>
              {menuOpen && (
                <>
                  <div className="menu-scrim" onClick={() => setMenuOpen(false)} />
                  <div className="menu">
                    <div className="menu-head"><b>{display}</b></div>
                    {isAdmin && <a href="/admin">Quản trị cửa hàng</a>}
                    <button onClick={async () => { setMenuOpen(false); await supabase.auth.signOut(); }}>Đăng xuất</button>
                  </div>
                </>
              )}
            </>
          ) : (
            <button className="btn ghost" onClick={() => setAuthOpen("login")} aria-label="Đăng nhập hoặc tạo tài khoản">
              <UserIcon /><span className="hide-sm">Đăng nhập</span>
            </button>
          )}
        </div>
      </div></header>

      <main className="wrap">
        <section className="hero">
          <h1>Đồ gia dụng làm thủ công cho căn nhà của bạn</h1>
          <p>Gốm, gỗ, vải lanh từ các làng nghề Việt Nam. Miễn phí giao hàng từ {fmt(FREE)}, thanh toán khi nhận hàng.</p>
          <input className="search" type="search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm bình gốm, thớt gỗ, gối lanh…" aria-label="Tìm sản phẩm" />
        </section>
        <div className="tools">
          <div className="chips">
            {cats.map((c) => (
              <button key={c} className="chip" aria-pressed={c === cat} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
          <select style={{ width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sắp xếp">
            <option value="new">Mới nhất</option>
            <option value="asc">Giá thấp đến cao</option>
            <option value="desc">Giá cao đến thấp</option>
          </select>
        </div>
        {products === null ? <p className="muted">Đang tải sản phẩm…</p>
          : list.length === 0 ? <p className="muted">Chưa có sản phẩm phù hợp.</p>
          : (
            <div className="grid">
              {list.map((p) => (
                <article className="card" key={p.id}>
                  <div className="thumb">{p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" /> : <span>{p.name[0]}</span>}</div>
                  <div className="info">
                    <h3>{p.name}</h3>
                    {p.description ? <p className="muted small">{p.description}</p> : null}
                    <div className="price"><b>{fmt(p.price)}</b>{p.old_price ? <s>{fmt(p.old_price)}</s> : null}</div>
                    <button className="btn" onClick={() => set(p.id, (cart[p.id] || 0) + 1)}>Thêm vào giỏ</button>
                  </div>
                </article>
              ))}
            </div>
          )}
      </main>

      <footer><div className="wrap muted">© 2026 Nhà Mộc. Hotline 1900 0000.</div></footer>

      {authOpen && (
        <>
          <div className="scrim" onClick={closeAuth} />
          <div className="modal" role="dialog" aria-modal="true" aria-label="Tài khoản">
            <div className="mtabs">
              <button className={"mtab" + (authOpen === "login" ? " on" : "")} onClick={() => { setAuthOpen("login"); setAuthMsg(null); }}>Đăng nhập</button>
              <button className={"mtab" + (authOpen === "signup" ? " on" : "")} onClick={() => { setAuthOpen("signup"); setAuthMsg(null); }}>Tạo tài khoản</button>
              <button className="btn ghost" onClick={closeAuth} aria-label="Đóng">✕</button>
            </div>
            <form className="stack" onSubmit={submitAuth}>
              {authOpen === "signup" && <p className="muted small" style={{ margin: 0 }}>Chỉ cần tên đăng nhập và mật khẩu.</p>}
              <input required placeholder="Tên đăng nhập" autoComplete="username" autoCapitalize="none" value={af.user} onChange={(e) => setAf({ ...af, user: e.target.value })} />
              <input required type="password" minLength={6} placeholder="Mật khẩu (ít nhất 6 ký tự)"
                autoComplete={authOpen === "login" ? "current-password" : "new-password"}
                value={af.pw} onChange={(e) => setAf({ ...af, pw: e.target.value })} />
              {authMsg && <div className={authMsg.err ? "err" : "ok"}>{authMsg.t}</div>}
              <button className="btn" disabled={authBusy}>
                {authBusy ? "Đang xử lý…" : authOpen === "login" ? "Đăng nhập" : "Tạo tài khoản"}
              </button>
            </form>
          </div>
        </>
      )}

      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={"drawer" + (open ? " on" : "")} aria-hidden={!open} aria-label="Giỏ hàng">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <b>Giỏ hàng của bạn</b>
          <button className="btn ghost" onClick={() => setOpen(false)} aria-label="Đóng giỏ hàng">✕</button>
        </div>
        <div className="body">
          <div className="small">
            {total >= FREE ? "Bạn được miễn phí giao hàng." : <>Mua thêm <b>{fmt(FREE - total)}</b> để được miễn phí giao hàng.</>}
            <div className="track"><i style={{ width: Math.min(100, (total / FREE) * 100) + "%" }} /></div>
          </div>
          {msg && <p className={msg.err ? "err" : "ok"}>{msg.t}</p>}
          {lines.length === 0 ? <p className="muted">Giỏ hàng đang trống.</p> : (
            <>
              {lines.map(({ p, n }) => (
                <div className="line" key={p.id}>
                  <div><div>{p.name}</div><small className="muted">{fmt(p.price)}</small></div>
                  <div className="qty">
                    <button onClick={() => set(p.id, n - 1)} aria-label="Giảm">−</button>
                    <span>{n}</span>
                    <button onClick={() => set(p.id, n + 1)} aria-label="Tăng">+</button>
                  </div>
                </div>
              ))}
              <form className="stack" onSubmit={order}>
                <input required placeholder="Họ và tên" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input required type="tel" placeholder="Số điện thoại" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <input required placeholder="Địa chỉ nhận hàng" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <input placeholder="Ghi chú (không bắt buộc)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                <button className="btn" disabled={busy}>{busy ? "Đang gửi…" : "Đặt hàng (" + fmt(total) + ")"}</button>
              </form>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
