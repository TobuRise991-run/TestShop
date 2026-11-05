"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase, fmt } from "../lib/supabase";

const FREE = 500000;

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

  useEffect(() => {
    supabase.from("products").select("*").eq("in_stock", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => setProducts(data || []));
    try { setCart(JSON.parse(localStorage.getItem("cart") || "{}")); } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem("cart", JSON.stringify(cart)); } catch {} }, [cart]);

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

  return (
    <>
      <header><div className="wrap bar">
        <a className="logo" href="/">Nhà Mộc</a>
        <button className="btn ghost" onClick={() => setOpen(true)}>Giỏ hàng<span className="badge">{count}</span></button>
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

      <footer><div className="wrap muted">© 2026 Nhà Mộc. Hotline 1900 0000. <a href="/admin">Quản trị</a></div></footer>

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
