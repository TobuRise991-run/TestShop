"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase, fmt } from "../../lib/supabase";

const EMPTY = { name: "", category: "", price: "", old_price: "", description: "", in_stock: true, image_url: "" };
const STATUS = { new: "Mới", confirmed: "Đã xác nhận", shipping: "Đang giao", done: "Hoàn tất", cancelled: "Đã hủy" };

export default function Admin() {
  const [user, setUser] = useState(undefined);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [f, setF] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const load = useCallback(async () => {
    const [p, o] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
    ]);
    setProducts(p.data || []); setOrders(o.data || []);
  }, []);
  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  async function login(e) {
    e.preventDefault(); setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) setErr("Sai email hoặc mật khẩu.");
  }
  async function save(e) {
    e.preventDefault(); setBusy(true); setNote(null);
    let image_url = f.image_url || null;
    if (file) {
      const path = crypto.randomUUID() + "." + (file.name.split(".").pop() || "jpg");
      const up = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
      if (up.error) { setBusy(false); return setNote({ err: true, t: "Tải ảnh thất bại: " + up.error.message }); }
      image_url = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    }
    const row = {
      name: f.name, category: f.category, price: Number(f.price),
      old_price: f.old_price ? Number(f.old_price) : null,
      description: f.description || null, in_stock: f.in_stock, image_url,
    };
    const { error } = f.id
      ? await supabase.from("products").update(row).eq("id", f.id)
      : await supabase.from("products").insert(row);
    setBusy(false);
    if (error) return setNote({ err: true, t: "Lưu thất bại: " + error.message });
    setF(EMPTY); setFile(null); setFileKey((k) => k + 1); setNote({ t: "Đã lưu sản phẩm." }); load();
  }
  async function remove(id) {
    if (!confirm("Xóa sản phẩm này?")) return;
    await supabase.from("products").delete().eq("id", id); load();
  }
  async function setStatus(id, status) {
    await supabase.from("orders").update({ status }).eq("id", id); load();
  }
  const out = () => supabase.auth.signOut();

  if (user === undefined) return <div className="admin wrap">Đang tải…</div>;

  if (!user) return (
    <div className="admin wrap" style={{ maxWidth: 420 }}>
      <h1>Đăng nhập quản trị</h1>
      <form className="stack" onSubmit={login}>
        <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input required type="password" placeholder="Mật khẩu" value={pw} onChange={(e) => setPw(e.target.value)} />
        {err && <div className="err">{err}</div>}
        <button className="btn">Đăng nhập</button>
      </form>
    </div>
  );

  if (!isAdmin) return (
    <div className="admin wrap" style={{ maxWidth: 520 }}>
      <h1>Chưa có quyền quản trị</h1>
      <p className="muted">Tài khoản {user.email} chưa được thêm vào bảng admins. Xem hướng dẫn trong README.</p>
      <button className="btn ghost" onClick={out}>Đăng xuất</button>
    </div>
  );

  return (
    <div className="admin wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1>Quản trị Nhà Mộc</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <a className="btn ghost" style={{ textDecoration: "none" }} href="/">Xem cửa hàng</a>
          <button className="btn ghost" onClick={out}>Đăng xuất</button>
        </div>
      </div>
      <div className="tabs">
        <button className={"btn" + (tab === "products" ? "" : " ghost")} onClick={() => setTab("products")}>Sản phẩm ({products.length})</button>
        <button className={"btn" + (tab === "orders" ? "" : " ghost")} onClick={() => setTab("orders")}>Đơn hàng ({orders.length})</button>
      </div>

      {tab === "products" && (<>
        <form className="panel" onSubmit={save}>
          <h2 style={{ marginTop: 0 }}>{f.id ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h2>
          <div className="fgrid">
            <label>Tên sản phẩm<input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
            <label>Danh mục<input required value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="Gốm sứ, Gỗ…" /></label>
            <label>Giá bán (đ)<input required type="number" min="0" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></label>
            <label>Giá gốc (đ, nếu giảm giá)<input type="number" min="0" value={f.old_price} onChange={(e) => setF({ ...f, old_price: e.target.value })} /></label>
            <label className="full">Mô tả ngắn<textarea rows="2" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
            <label className="full">Ảnh sản phẩm {f.image_url && !file ? "(đang dùng ảnh hiện tại)" : ""}
              <input key={fileKey} type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0] || null)} /></label>
            <label><input type="checkbox" checked={f.in_stock} onChange={(e) => setF({ ...f, in_stock: e.target.checked })} /> Còn hàng, hiển thị trên cửa hàng</label>
          </div>
          {note && <p className={note.err ? "err" : "ok"}>{note.t}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn" disabled={busy}>{busy ? "Đang lưu…" : "Lưu sản phẩm"}</button>
            {f.id && <button type="button" className="btn ghost" onClick={() => { setF(EMPTY); setFile(null); setFileKey((k) => k + 1); }}>Hủy sửa</button>}
          </div>
        </form>
        <div className="panel">
          {products.length === 0 && <p className="muted">Chưa có sản phẩm.</p>}
          {products.map((p) => (
            <div className="rowitem" key={p.id}>
              <div className="t">{p.image_url ? <img src={p.image_url} alt="" /> : p.name[0]}</div>
              <div className="grow"><b>{p.name}</b><div className="muted small">{p.category} · {fmt(p.price)}{p.in_stock ? "" : " · Đang ẩn"}</div></div>
              <button className="btn ghost" onClick={() => { setF({ ...p, old_price: p.old_price ?? "", description: p.description ?? "", image_url: p.image_url ?? "" }); setFile(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Sửa</button>
              <button className="btn danger" onClick={() => remove(p.id)}>Xóa</button>
            </div>
          ))}
        </div>
      </>)}

      {tab === "orders" && (
        <div className="panel">
          {orders.length === 0 && <p className="muted">Chưa có đơn hàng.</p>}
          {orders.map((o) => (
            <div className="rowitem" key={o.id}>
              <div className="grow">
                <b>{o.customer_name}</b> · {o.phone}
                <div className="muted small">{o.address}{o.note ? " · " + o.note : ""}</div>
                <div className="small">{o.items.map((i) => i.name + " ×" + i.qty).join(", ")}</div>
                <div className="small muted">{new Date(o.created_at).toLocaleString("vi-VN")}</div>
              </div>
              <b>{fmt(o.total)}</b>
              <select style={{ width: "auto" }} value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} aria-label="Trạng thái đơn hàng">
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
