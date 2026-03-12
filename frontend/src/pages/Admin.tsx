import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  adminApi,
  AdminStats,
  AdminUser,
  AdminChapter,
  AdminLesson,
  AdminBoss,
  AdminPayment,
  AdminConversation,
  AdminAchievement,
} from "@/services/adminService";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const neo = {
  card: { border: "3px solid black", boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)" } as React.CSSProperties,
  btn: { border: "3px solid black", boxShadow: "3px 3px 0px 0px rgba(0,0,0,1)" } as React.CSSProperties,
};

const PRIMARY = "#FF6B35";
const BG = "#F9F5EB";

function fmtVnd(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

function handleError(err: unknown) {
  toast({
    variant: "destructive",
    title: "Có lỗi xảy ra",
    description: err instanceof Error ? err.message : String(err),
  });
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

const navItems = [
  { icon: "dashboard", label: "Bảng điều khiển", key: "dashboard" },
  { icon: "group", label: "Quản lý người dùng", key: "users" },
  { icon: "menu_book", label: "Quản lý nội dung", key: "content" },
  { icon: "barefoot", label: "Cài đặt Boss", key: "boss" },
  { icon: "bolt", label: "Nhật ký năng lượng", key: "conversations" },
  { icon: "payments", label: "Thanh toán", key: "payment" },
  { icon: "emoji_events", label: "Thành tựu", key: "achievements" },
];

// ─── Loading ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <span className="material-symbols-outlined animate-spin text-4xl" style={{ color: PRIMARY }}>
        progress_activity
      </span>
    </div>
  );
}

// ─── Page titles ─────────────────────────────────────────────────────────────

const pageTitles: Record<string, { title: string; sub: string }> = {
  dashboard: { title: "BẢNG ĐIỀU KHIỂN", sub: "Tổng quan hệ thống" },
  users: { title: "QUẢN LÝ NGƯỜI DÙNG", sub: "Xem và cập nhật tài khoản" },
  content: { title: "QUẢN LÝ NỘI DUNG", sub: "Quản lý chapters và lessons" },
  boss: { title: "CÀI ĐẶT BOSS", sub: "Chỉnh sửa nhân vật Boss" },
  conversations: { title: "NHẬT KÝ BOSS FIGHT", sub: "Lịch sử các trận đấu" },
  payment: { title: "THANH TOÁN", sub: "Thống kê và kiểm tra giao dịch" },
  achievements: { title: "THÀNH TỰU", sub: "Quản lý huy hiệu và điều kiện mở khoá" },
};

// ─── Sub-page: Dashboard ──────────────────────────────────────────────────────

function DashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminApi.getStats(), adminApi.listConversations(0, 5)])
      .then(([s, c]) => {
        setStats(s);
        setConversations(c);
      })
      .finally(() => setLoading(false));
  }, []);

  const chartBars = [
    { label: "T2", h: 55, value: "1.2k" },
    { label: "T3", h: 75, value: "2.1k" },
    { label: "T4", h: 65, value: "1.8k" },
    { label: "T5", h: 90, value: "3.2k", active: true },
    { label: "T6", h: 70, value: "2.0k" },
    { label: "T7", h: 82, value: "2.8k" },
    { label: "CN", h: 50, value: "1.5k" },
  ];

  const mockLessonLogs = [
    { id: 1, user: "Minh Anh", avatar: "M", lesson: "Chào hỏi căn bản #1", time: "Hôm nay, 14:20", nrg: "-15 NRG", status: "HOÀN THÀNH" },
    { id: 2, user: "Hoàng Nam", avatar: "H", lesson: "Từ vựng Du lịch", time: "Hôm nay, 13:55", nrg: "-20 NRG", status: "HOÀN THÀNH" },
    { id: 3, user: "Thu Thủy", avatar: "T", lesson: "Giao tiếp Cơ bản", time: "Hôm nay, 10:10", nrg: "-25 NRG", status: "ĐANG HỌC" },
  ];

  if (loading) return <Spinner />;

  const statCards = stats
    ? [
      { label: "Tổng người dùng", value: stats.total_users.toLocaleString(), icon: "group" },
      { label: "Bài học đang mở", value: stats.active_lessons.toLocaleString(), icon: "menu_book" },
      { label: "Boss Fights", value: stats.total_conversations.toLocaleString(), icon: "skull" },
      { label: "Doanh thu", value: fmtVnd(stats.total_revenue_vnd), icon: "payments", highlight: true },
    ]
    : [];

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((c) => (
          <div key={c.label} className="bg-white p-4 relative overflow-hidden" style={neo.card}>
            <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: PRIMARY }} />
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-black text-slate-500 uppercase">{c.label}</p>
              <span className="material-symbols-outlined text-base text-slate-400">{c.icon}</span>
            </div>
            <h3 className="text-2xl font-black" style={c.highlight ? { color: PRIMARY } : {}}>
              {c.value}
            </h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white px-6 pt-6 pb-2" style={neo.card}>
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-lg font-black uppercase italic tracking-tight">Hoạt động người dùng</h4>
            <div
              className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 cursor-pointer bg-white"
              style={{ border: "2px solid black" }}
            >
              7 ngày qua <span className="material-symbols-outlined text-sm m-[-2px]">expand_more</span>
            </div>
          </div>
          <div className="h-48 flex items-end justify-between px-2 gap-3 max-w-[90%] mx-auto pb-4">
            {chartBars.map((b) => (
              <div key={b.label} className="flex-1 flex flex-col items-center gap-2 group">
                <div
                  className="w-full relative transition-colors max-w-[36px]"
                  style={{
                    height: `${b.h}%`,
                    border: "2px solid black",
                    backgroundColor: b.active ? PRIMARY : "white",
                  }}
                >
                  <div
                    className={`absolute -top-7 left-1/2 -translate-x-1/2 bg-black text-white px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap ${b.active ? "block" : "hidden group-hover:block"}`}
                  >
                    {b.value}
                  </div>
                </div>
                <span className="text-[10px] font-black">{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 flex flex-col" style={neo.card}>
          <h4 className="text-lg font-black uppercase italic tracking-tight mb-5">Trận đấu boss gần đây</h4>
          {conversations.length === 0 ? (
            <p className="text-sm text-slate-400 font-bold mb-auto">Chưa có trận đấu nào</p>
          ) : (
            <div className="space-y-3 mb-4 flex-1">
              {conversations.map((c) => {
                const isWin = c.status === "completed";
                const statusText = isWin ? "THẮNG" : (c.status === "lost" ? "THUA" : "THOÁT");
                return (
                  <div
                    key={c.id}
                    className="p-3 flex items-center justify-between gap-3 bg-white"
                    style={{ border: "2px solid black", boxShadow: c.status === "completed" ? "0px 0px 0px 0px rgba(0,0,0,1)" : "0px 0px 0px 0px rgba(0,0,0,1)" }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 flex flex-col justify-center items-center font-black text-white text-[15px] flex-shrink-0"
                        style={{ backgroundColor: isWin ? "black" : "#94a3b8" }}
                      >
                        {isWin ? "W" : "L"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black italic truncate leading-[1.2]">
                          {c.user_name}
                        </p>
                        <p className="text-[11px] font-black italic truncate leading-[1.2]">
                          vs. {c.boss_name}
                        </p>
                        <p className="text-[8px] font-bold text-slate-500 uppercase mt-0.5 whitespace-nowrap">
                          {statusText} • {timeAgo(c.started_at)}
                        </p>
                      </div>
                    </div>
                    <div className={`text-xs font-black flex-shrink-0 whitespace-nowrap ${isWin ? "text-[#FF6B35]" : "text-slate-500"}`}>
                      {isWin ? "+200 XP" : "0 XP"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button className="w-full mt-auto py-2 bg-white text-[10px] tracking-wider font-black uppercase transition-transform active:translate-y-1" style={{ border: "2px solid black" }}>
            Xem tất cả
          </button>
        </div>
      </div>

      <div className="mt-6 bg-[#FAF9F6] overflow-hidden" style={neo.card}>
        <div className="p-5 flex justify-between items-center" style={{ borderBottom: "3px solid black" }}>
          <h4 className="text-lg font-black uppercase italic tracking-tight">Nhật ký bài học mới nhất</h4>
          <span className="material-symbols-outlined font-black cursor-pointer text-xl">filter_list</span>
        </div>
        <div className="overflow-x-auto bg-white">
          <table className="w-full text-left">
            <thead>
              <tr
                className="text-[10px] font-black uppercase text-slate-600 bg-white"
                style={{ borderBottom: "3px solid black" }}
              >
                <th className="px-6 py-4 w-[25%] tracking-widest">Người dùng</th>
                <th className="px-6 py-4 w-[25%] tracking-widest">Bài học</th>
                <th className="px-6 py-4 w-[15%] tracking-widest">Thời gian</th>
                <th className="px-6 py-4 w-[15%] tracking-widest text-center">Năng lượng</th>
                <th className="px-6 py-4 w-[12%] text-center tracking-widest">Trạng thái</th>
                <th className="px-6 py-4 w-[8%] text-center tracking-widest">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {mockLessonLogs.map((log, i) => (
                <tr
                  key={log.id}
                  className="hover:bg-orange-50 transition-colors bg-white"
                  style={{ borderBottom: i === mockLessonLogs.length - 1 ? "none" : "2px solid black" }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center font-black text-xs flex-shrink-0"
                        style={{ border: "2px solid black" }}
                      >
                        {log.avatar}
                      </div>
                      <span className="font-bold text-sm truncate">{log.user}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] font-bold truncate">{log.lesson}</td>
                  <td className="px-6 py-4 text-[13px] text-slate-500 italic whitespace-nowrap">{log.time}</td>
                  <td className="px-6 py-4 text-[13px] font-black text-center whitespace-nowrap">{log.nrg}</td>
                  <td className="px-6 py-4 text-center">
                    {log.status === "HOÀN THÀNH" ? (
                      <span className="inline-block text-[10px] font-black px-2 py-1 bg-black text-white italic whitespace-nowrap">
                        {log.status}
                      </span>
                    ) : (
                      <span className="inline-block text-[10px] font-black px-2 py-1 text-white italic whitespace-nowrap" style={{ backgroundColor: "#FF6B35" }}>
                        {log.status}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="material-symbols-outlined text-slate-400 hover:text-black font-bold">
                      more_vert
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Sub-page: Users ──────────────────────────────────────────────────────────

function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit/Create modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // View detail drawer
  const [drawerUser, setDrawerUser] = useState<AdminUser | null>(null);

  // Delete confirm
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [formConfig, setFormConfig] = useState({
    display_name: "",
    email: "",
    password: "",
    role: "user",
    plan: "free",
    energy: 3,
  });

  useEffect(() => {
    adminApi
      .listUsers()
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  function openCreateModal() {
    setModalMode("create");
    setFormConfig({ display_name: "", email: "", password: "", role: "user", plan: "free", energy: 3 });
    setIsModalOpen(true);
  }

  function openEditModal(user: AdminUser) {
    setModalMode("edit");
    setEditingUserId(user.id);
    setFormConfig({
      display_name: user.display_name,
      email: user.email,
      password: "",
      role: user.role,
      plan: user.plan,
      energy: user.energy,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingUserId(null);
  }

  async function handleSaveUser() {
    try {
      if (modalMode === "create") {
        if (!formConfig.email || !formConfig.password || !formConfig.display_name) {
          toast({
            variant: "destructive",
            title: "Thiếu thông tin",
            description: "Vui lòng nhập đủ tên, email và mật khẩu!",
          });
          return;
        }
        const created = await adminApi.createUser(formConfig);
        setUsers([created, ...users]);
        toast({
          title: "Thành công",
          description: "Đã tạo tài khoản cho " + formConfig.display_name,
        });
      } else if (modalMode === "edit" && editingUserId) {
        const updated = await adminApi.updateUser(editingUserId, {
          role: formConfig.role,
          plan: formConfig.plan,
          energy: formConfig.energy,
        });
        setUsers((u) => u.map((x) => (x.id === editingUserId ? updated : x)));
        toast({
          title: "Thành công",
          description: "Đã cập nhật tài khoản: " + updated.email,
        });
      }
      closeModal();
    } catch (err) {
      handleError(err);
    }
  }

  async function handleDeleteUser() {
    if (!deletingUser) return;
    setDeleteLoading(true);
    try {
      await adminApi.deleteUser(deletingUser.id);
      setUsers((u) => u.filter((x) => x.id !== deletingUser.id));
      toast({ title: "Đã xóa", description: `Tài khoản "${deletingUser.display_name}" đã được xóa.` });
      setDeletingUser(null);
    } catch (err) {
      handleError(err);
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading) return <Spinner />;

  const planColor: Record<string, string> = { free: "#64748b", monthly: "#0284c7", yearly: "#7c3aed" };

  return (
    <>
      {/* ── Animations ── */}
      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes slideInRight { from { opacity:0; transform:translateX(100%) } to { opacity:1; transform:translateX(0) } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.92) } to { opacity:1; transform:scale(1) } }
        .anim-fadeIn { animation: fadeIn .2s ease both }
        .anim-slideUp { animation: slideUp .25s cubic-bezier(0.34,1.2,0.64,1) both }
        .anim-slideInRight { animation: slideInRight .3s cubic-bezier(0.34,1.1,0.64,1) both }
        .anim-scaleIn { animation: scaleIn .2s cubic-bezier(0.34,1.2,0.64,1) both }
        .action-btn { 
          display:inline-flex; align-items:center; justify-content:center;
          width:30px; height:30px; border-radius:4px; transition: all .15s ease;
          font-size:18px; border:2px solid transparent; cursor:pointer;
        }
        .action-btn:hover { transform: translateY(-2px); box-shadow:2px 2px 0 black; border-color:black; }
        .action-btn:active { transform: translateY(1px); box-shadow:0 0 0 black; }
      `}</style>

      <div className="bg-white overflow-hidden relative" style={neo.card}>
        <div className="p-4 bg-slate-50 flex justify-between items-center" style={{ borderBottom: "3px solid black" }}>
          <h4 className="text-sm font-black uppercase tracking-wider italic">Người dùng ({users.length})</h4>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1 text-xs font-black px-3 py-2 text-white transition-all active:translate-y-0.5 cursor-pointer hover:brightness-110"
            style={{ backgroundColor: PRIMARY, ...neo.btn }}
          >
            <span className="material-symbols-outlined text-sm">add</span> Thêm User
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100 text-xs font-black uppercase tracking-wider" style={{ borderBottom: "3px solid black" }}>
                <th className="px-4 py-3">Người dùng</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Gói</th>
                <th className="px-4 py-3">Năng lượng</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr
                  key={u.id}
                  className="hover:bg-orange-50 transition-colors"
                  style={{ borderBottom: "1px solid rgba(0,0,0,0.08)", animationDelay: `${i * 40}ms` }}
                >
                  <td className="px-4 py-3 font-bold">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm text-white flex-shrink-0"
                        style={{ background: `hsl(${(u.display_name.charCodeAt(0) * 37) % 360}, 60%, 50%)`, border: "2px solid black" }}
                      >
                        {u.display_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate max-w-[120px]">{u.display_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-[10px] font-black px-2 py-0.5 uppercase text-white"
                      style={{ backgroundColor: u.role === "admin" ? PRIMARY : "black" }}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-[10px] font-black px-2 py-0.5 uppercase text-white"
                      style={{ backgroundColor: planColor[u.plan] ?? "#64748b" }}
                    >
                      {u.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]" style={{ color: PRIMARY }}>electric_bolt</span>
                      <span className="font-black text-sm">{u.energy}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(u.created_at).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {/* View detail */}
                      <button
                        title="Xem chi tiết"
                        onClick={(e) => { e.stopPropagation(); setDrawerUser(u); }}
                        className="action-btn"
                        style={{ color: "#0284c7", backgroundColor: "#e0f2fe" }}
                      >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </button>
                      {/* Edit */}
                      <button
                        title="Chỉnh sửa"
                        onClick={(e) => { e.stopPropagation(); openEditModal(u); }}
                        className="action-btn"
                        style={{ color: "#854d0e", backgroundColor: "#fef9c3" }}
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      {/* Delete */}
                      <button
                        title="Xóa tài khoản"
                        onClick={(e) => { e.stopPropagation(); setDeletingUser(u); }}
                        className="action-btn"
                        style={{ color: "#dc2626", backgroundColor: "#fee2e2" }}
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Edit / Create Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 anim-fadeIn">
          <div className="bg-white w-full max-w-md flex flex-col anim-scaleIn" style={{ ...neo.card, maxHeight: "90vh" }}>
            <div className="p-4 flex justify-between items-center" style={{ backgroundColor: BG, borderBottom: "3px solid black" }}>
              <h3 className="text-lg font-black uppercase italic tracking-tight">
                {modalMode === "create" ? "Tạo Người Dùng Mới" : "Cập Nhật Thông Tin"}
              </h3>
              <button onClick={closeModal} className="material-symbols-outlined font-black cursor-pointer hover:text-red-500 transition-colors">
                close
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {modalMode === "create" && (
                <>
                  <div>
                    <label className="block text-xs font-black uppercase mb-1">Tên hiển thị <span className="text-red-500">*</span></label>
                    <input
                      className="w-full px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 transition-shadow"
                      placeholder="VD: Nguyễn Văn A"
                      style={{ border: "2px solid black" }}
                      value={formConfig.display_name}
                      onChange={(e) => setFormConfig({ ...formConfig, display_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase mb-1">Email <span className="text-red-500">*</span></label>
                    <input
                      className="w-full px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 transition-shadow"
                      placeholder="name@example.com"
                      style={{ border: "2px solid black" }}
                      value={formConfig.email}
                      onChange={(e) => setFormConfig({ ...formConfig, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase mb-1">Mật khẩu <span className="text-red-500">*</span></label>
                    <input
                      className="w-full px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 transition-shadow"
                      placeholder="••••••••"
                      type="password"
                      style={{ border: "2px solid black" }}
                      value={formConfig.password}
                      onChange={(e) => setFormConfig({ ...formConfig, password: e.target.value })}
                    />
                  </div>
                </>
              )}
              {modalMode === "edit" && (
                <div className="flex items-center gap-3 p-3" style={{ border: "2px dashed black", backgroundColor: "#fef9c3" }}>
                  <span className="material-symbols-outlined text-yellow-600">info</span>
                  <p className="text-sm font-bold">Đang sửa: <span className="text-orange-600 font-black">{formConfig.email}</span></p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Phân quyền</label>
                  <select
                    className="w-full px-3 py-2 text-sm font-bold focus:outline-none bg-white cursor-pointer"
                    style={{ border: "2px solid black" }}
                    value={formConfig.role}
                    onChange={(e) => setFormConfig({ ...formConfig, role: e.target.value })}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Gói cước</label>
                  <select
                    className="w-full px-3 py-2 text-sm font-bold focus:outline-none bg-white cursor-pointer"
                    style={{ border: "2px solid black" }}
                    value={formConfig.plan}
                    onChange={(e) => setFormConfig({ ...formConfig, plan: e.target.value })}
                  >
                    <option value="free">Free</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-1">Năng lượng</label>
                <div className="flex gap-2 items-center px-3 py-2 bg-slate-50" style={{ border: "2px solid black" }}>
                  <span className="material-symbols-outlined text-[#FF6B35]">electric_bolt</span>
                  <input
                    className="w-full text-sm font-bold focus:outline-none bg-transparent"
                    type="number"
                    value={formConfig.energy}
                    onChange={(e) => setFormConfig({ ...formConfig, energy: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 flex gap-3" style={{ borderTop: "3px solid black" }}>
              <button
                onClick={closeModal}
                className="flex-1 font-black text-xs px-4 py-3 uppercase tracking-wider transition-transform active:translate-y-1 hover:bg-slate-100"
                style={{ border: "2px solid black" }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveUser}
                className="flex-1 font-black text-xs px-4 py-3 text-white uppercase tracking-wider transition-all active:translate-y-1 hover:brightness-110"
                style={{ backgroundColor: PRIMARY, border: "2px solid black", boxShadow: "3px 3px 0 black" }}
              >
                {modalMode === "create" ? "Tạo Mới" : "Lưu Thay Đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Detail Drawer ── */}
      {drawerUser && (
        <div className="fixed inset-0 z-50 anim-fadeIn" onClick={() => setDrawerUser(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="absolute right-0 top-0 h-full w-full max-w-sm bg-white flex flex-col anim-slideInRight"
            style={{ borderLeft: "3px solid black", boxShadow: "-6px 0 0 black" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 flex items-center justify-between" style={{ backgroundColor: BG, borderBottom: "3px solid black" }}>
              <h3 className="font-black uppercase italic tracking-tight text-base">Chi tiết người dùng</h3>
              <button
                onClick={() => setDrawerUser(null)}
                className="material-symbols-outlined hover:text-red-500 transition-colors font-black cursor-pointer"
              >
                close
              </button>
            </div>

            {/* Avatar + name */}
            <div className="p-6 flex flex-col items-center gap-3" style={{ borderBottom: "2px solid black" }}>
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center font-black text-3xl text-white"
                style={{
                  background: `hsl(${(drawerUser.display_name.charCodeAt(0) * 37) % 360}, 60%, 50%)`,
                  border: "3px solid black",
                  boxShadow: "4px 4px 0 black",
                }}
              >
                {drawerUser.display_name.charAt(0).toUpperCase()}
              </div>
              <p className="font-black text-xl tracking-tight">{drawerUser.display_name}</p>
              <span
                className="text-[11px] font-black px-3 py-1 uppercase text-white"
                style={{ backgroundColor: drawerUser.role === "admin" ? PRIMARY : "black" }}
              >
                {drawerUser.role}
              </span>
            </div>

            {/* Info rows */}
            <div className="flex-1 overflow-y-auto">
              {[
                { icon: "email", label: "Email", value: drawerUser.email },
                { icon: "workspace_premium", label: "Gói cước", value: drawerUser.plan.toUpperCase() },
                { icon: "electric_bolt", label: "Năng lượng", value: String(drawerUser.energy) + " ⚡" },
                { icon: "calendar_today", label: "Ngày tạo", value: new Date(drawerUser.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) },
                { icon: "fingerprint", label: "User ID", value: drawerUser.id },
              ].map((row) => (
                <div key={row.label} className="flex items-start gap-4 px-6 py-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                  <span className="material-symbols-outlined text-slate-400 text-xl flex-shrink-0 mt-0.5">{row.icon}</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">{row.label}</p>
                    <p className="text-sm font-bold break-all">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer actions */}
            <div className="p-4 flex gap-2" style={{ borderTop: "3px solid black" }}>
              <button
                onClick={() => { setDrawerUser(null); openEditModal(drawerUser); }}
                className="flex-1 flex items-center justify-center gap-1 font-black text-xs px-4 py-3 uppercase tracking-wider transition-all active:translate-y-0.5 hover:bg-yellow-50"
                style={{ border: "2px solid black", boxShadow: "2px 2px 0 black" }}
              >
                <span className="material-symbols-outlined text-sm">edit</span> Chỉnh sửa
              </button>
              <button
                onClick={() => { setDrawerUser(null); setDeletingUser(drawerUser); }}
                className="flex-1 flex items-center justify-center gap-1 font-black text-xs px-4 py-3 uppercase tracking-wider text-white transition-all active:translate-y-0.5 hover:brightness-110"
                style={{ backgroundColor: "#dc2626", border: "2px solid black", boxShadow: "2px 2px 0 black" }}
              >
                <span className="material-symbols-outlined text-sm">delete</span> Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Dialog ── */}
      {deletingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 anim-fadeIn">
          <div className="bg-white w-full max-w-sm anim-scaleIn" style={{ ...neo.card }}>
            <div className="p-5" style={{ borderBottom: "3px solid black", backgroundColor: "#fff1f2" }}>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-red-600 text-3xl">warning</span>
                <h3 className="font-black uppercase italic text-base">Xác nhận xóa</h3>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm font-bold">Bạn có chắc muốn xóa tài khoản này không?</p>
              <div className="flex items-center gap-3 p-3" style={{ border: "2px solid #dc2626", backgroundColor: "#fff1f2" }}>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm text-white flex-shrink-0"
                  style={{ background: `hsl(${(deletingUser.display_name.charCodeAt(0) * 37) % 360}, 60%, 50%)`, border: "2px solid black" }}
                >
                  {deletingUser.display_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-sm">{deletingUser.display_name}</p>
                  <p className="text-xs text-slate-500">{deletingUser.email}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 font-bold">⚠️ Hành động này không thể hoàn tác.</p>
            </div>
            <div className="p-4 flex gap-3" style={{ borderTop: "3px solid black" }}>
              <button
                onClick={() => setDeletingUser(null)}
                disabled={deleteLoading}
                className="flex-1 font-black text-xs px-4 py-3 uppercase tracking-wider transition-all active:translate-y-0.5 hover:bg-slate-100 disabled:opacity-50"
                style={{ border: "2px solid black" }}
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                className="flex-1 flex items-center justify-center gap-1 font-black text-xs px-4 py-3 text-white uppercase tracking-wider transition-all active:translate-y-0.5 disabled:opacity-60"
                style={{ backgroundColor: "#dc2626", border: "2px solid black", boxShadow: "3px 3px 0 black" }}
              >
                {deleteLoading ? (
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                ) : (
                  <><span className="material-symbols-outlined text-sm">delete</span> Xóa vĩnh viễn</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Sub-page: Content ────────────────────────────────────────────────────────

function LessonRow({
  lesson,
  onUpdate,
  onDelete,
}: {
  lesson: AdminLesson;
  onUpdate: (updated: AdminLesson) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: lesson.title,
    video_url: lesson.video_url ?? "",
    video_duration: lesson.video_duration,
    action_prompt: lesson.action_prompt ?? "",
    order_index: lesson.order_index,
    is_published: lesson.is_published,
  });

  async function save() {
    try {
      const updated = await adminApi.updateLesson(lesson.id, form);
      onUpdate(updated);
      setEditing(false);
    } catch (err) {
      handleError(err);
    }
  }

  if (editing) {
    return (
      <div className="p-3 space-y-2" style={{ borderTop: "1px solid rgba(0,0,0,0.1)" }}>
        <div className="flex gap-2">
          <input
            className="flex-1 px-2 py-1 text-sm font-bold focus:outline-none"
            placeholder="Tiêu đề"
            style={{ border: "2px solid black" }}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            className="w-16 px-2 py-1 text-sm font-bold focus:outline-none"
            type="number"
            placeholder="Thứ tự"
            style={{ border: "2px solid black" }}
            value={form.order_index}
            onChange={(e) => setForm({ ...form, order_index: +e.target.value })}
          />
          <input
            className="w-20 px-2 py-1 text-sm font-bold focus:outline-none"
            type="number"
            placeholder="Giây"
            style={{ border: "2px solid black" }}
            value={form.video_duration}
            onChange={(e) => setForm({ ...form, video_duration: +e.target.value })}
          />
        </div>
        <input
          className="w-full px-2 py-1 text-sm font-bold focus:outline-none"
          placeholder="Video URL"
          style={{ border: "2px solid black" }}
          value={form.video_url}
          onChange={(e) => setForm({ ...form, video_url: e.target.value })}
        />
        <textarea
          className="w-full px-2 py-1 text-sm font-mono focus:outline-none"
          rows={2}
          placeholder="Action prompt (The Loop)..."
          style={{ border: "2px solid black" }}
          value={form.action_prompt}
          onChange={(e) => setForm({ ...form, action_prompt: e.target.value })}
        />
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-1 text-xs font-bold">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
            />
            Published
          </label>
          <button
            onClick={save}
            className="text-xs font-black px-2 py-1 text-white ml-auto"
            style={{ backgroundColor: PRIMARY, border: "2px solid black" }}
          >
            Lưu
          </button>
          <button
            onClick={() => setEditing(false)}
            className="text-xs font-black px-2 py-1"
            style={{ border: "2px solid black" }}
          >
            Huỷ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2" style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}>
      <span className="text-xs font-black text-slate-400 w-5 text-right flex-shrink-0">{lesson.order_index + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{lesson.title}</p>
        <p className="text-[10px] text-slate-400 font-bold">
          {lesson.video_duration}s{lesson.action_prompt ? " · has action" : ""}
        </p>
      </div>
      <span
        className="text-[10px] font-black px-1.5 py-0.5"
        style={{
          border: "1px solid black",
          backgroundColor: lesson.is_published ? "black" : "transparent",
          color: lesson.is_published ? "white" : "black",
        }}
      >
        {lesson.is_published ? "PUB" : "draft"}
      </span>
      <button
        onClick={() => setEditing(true)}
        className="material-symbols-outlined text-slate-400 hover:text-black text-base font-bold"
      >
        edit
      </button>
      <button
        onClick={() => {
          if (confirm("Xoá lesson này?")) onDelete(lesson.id);
        }}
        className="material-symbols-outlined text-red-400 hover:text-red-600 text-base font-bold"
      >
        delete
      </button>
    </div>
  );
}

function ChapterCard({
  chapter,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  chapter: AdminChapter;
  onUpdate: (updated: AdminChapter) => void;
  onDelete: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  // Modal thêm / sửa lesson
  const [lessonModal, setLessonModal] = useState<{ open: boolean; editId: string | null }>({ open: false, editId: null });
  const [lessonForm, setLessonForm] = useState({
    title: "",
    video_url: "",
    video_duration: 0,
    action_prompt: "",
    order_index: 0,
    is_published: false,
  });
  const [savingLesson, setSavingLesson] = useState(false);

  async function toggle() {
    if (!expanded && !loadedOnce) {
      setLoadingLessons(true);
      const data = await adminApi.listLessons(chapter.id);
      setLessons(data);
      setLoadedOnce(true);
      setLoadingLessons(false);
    }
    setExpanded((v) => !v);
  }

  function openAddModal() {
    setLessonForm({ title: "", video_url: "", video_duration: 0, action_prompt: "", order_index: lessons.length, is_published: false });
    setLessonModal({ open: true, editId: null });
  }

  function openEditModal(lesson: AdminLesson) {
    setLessonForm({
      title: lesson.title,
      video_url: lesson.video_url ?? "",
      video_duration: lesson.video_duration,
      action_prompt: lesson.action_prompt ?? "",
      order_index: lesson.order_index,
      is_published: lesson.is_published,
    });
    setLessonModal({ open: true, editId: lesson.id });
  }

  function closeModal() {
    setLessonModal({ open: false, editId: null });
  }

  async function saveLesson() {
    if (!lessonForm.title.trim()) return;
    setSavingLesson(true);
    try {
      if (lessonModal.editId) {
        const updated = await adminApi.updateLesson(lessonModal.editId, lessonForm);
        setLessons((l) => l.map((x) => (x.id === lessonModal.editId ? updated : x)));
        toast({ title: "Đã lưu", description: `Cập nhật lesson "${updated.title}" thành công.` });
      } else {
        const created = await adminApi.createLesson(chapter.id, { ...lessonForm, order_index: lessons.length });
        setLessons((l) => [...l, created]);
        onUpdate({ ...chapter, lesson_count: chapter.lesson_count + 1 });
        toast({ title: "Đã thêm", description: `Lesson "${created.title}" đã được tạo.` });
      }
      closeModal();
    } catch (err) {
      handleError(err);
    } finally {
      setSavingLesson(false);
    }
  }

  async function deleteLesson(id: string) {
    await adminApi.deleteLesson(id);
    setLessons((l) => l.filter((x) => x.id !== id));
    onUpdate({ ...chapter, lesson_count: chapter.lesson_count - 1 });
  }

  async function moveLessonUp(idx: number) {
    if (idx === 0) return;
    const sorted = [...lessons].sort((a, b) => a.order_index - b.order_index);
    const a = sorted[idx], b = sorted[idx - 1];
    await Promise.all([
      adminApi.updateLesson(a.id, { order_index: b.order_index }),
      adminApi.updateLesson(b.id, { order_index: a.order_index }),
    ]);
    setLessons((l) => l.map((x) => x.id === a.id ? { ...x, order_index: b.order_index } : x.id === b.id ? { ...x, order_index: a.order_index } : x));
  }

  async function moveLessonDown(idx: number) {
    const sorted = [...lessons].sort((a, b) => a.order_index - b.order_index);
    if (idx >= sorted.length - 1) return;
    const a = sorted[idx], b = sorted[idx + 1];
    await Promise.all([
      adminApi.updateLesson(a.id, { order_index: b.order_index }),
      adminApi.updateLesson(b.id, { order_index: a.order_index }),
    ]);
    setLessons((l) => l.map((x) => x.id === a.id ? { ...x, order_index: b.order_index } : x.id === b.id ? { ...x, order_index: a.order_index } : x));
  }

  return (
    <>
      <div className="bg-white group" style={{ border: "3px solid black", boxShadow: expanded ? "4px 4px 0px 0px black" : "4px 4px 0px 0px black", marginBottom: "32px", opacity: chapter.is_published ? 1 : 0.7 }}>
        <div className="p-5 flex items-center justify-between bg-[#fefefe] cursor-pointer" onClick={toggle} style={{ borderBottom: expanded ? "3px solid black" : "none" }}>
          
          <div className="flex items-center gap-4">
            <span 
              className="text-white px-3 py-1 text-xs font-black uppercase" 
              style={{ backgroundColor: chapter.is_published ? "black" : "#64748b", border: "3px solid black" }}
            >
              CHAPTER {chapter.order_index + 1}
            </span>
            
            <h3 className="text-xl font-extrabold uppercase" style={{ color: chapter.is_published ? "inherit" : "#64748b" }}>
              {chapter.title}
            </h3>
            
            <span 
              className="px-3 py-0.5 text-xs font-bold"
              style={{ 
                backgroundColor: chapter.is_published ? "#ffebd2" : "white", 
                color: chapter.is_published ? PRIMARY : "#64748b", 
                border: `2px solid ${chapter.is_published ? PRIMARY : "#64748b"}` 
              }}
            >
              {chapter.boss_unlock_threshold}% HOÀN THÀNH ĐỂ MỞ BOSS
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!expanded ? (
               <button className="p-2 bg-white hover:bg-slate-50 transition-colors" style={{ border: "2px solid black", boxShadow: "2px 2px 0px 0px black" }}>
                 <span className="material-symbols-outlined text-sm font-bold">keyboard_arrow_down</span>
               </button>
            ) : (
              <>
                <button
                  disabled={isFirst}
                  onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }}
                  className="p-2 bg-white hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" 
                  style={{ border: "2px solid black", boxShadow: "2px 2px 0px 0px black" }}
                  title="Lên trên"
                >
                  <span className="material-symbols-outlined text-sm font-bold">arrow_upward</span>
                </button>
                <button
                  disabled={isLast}
                  onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}
                  className="p-2 bg-white hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" 
                  style={{ border: "2px solid black", boxShadow: "2px 2px 0px 0px black" }}
                  title="Xuống dưới"
                >
                  <span className="material-symbols-outlined text-sm font-bold">arrow_downward</span>
                </button>
                
                <button
                  onClick={(e) => { e.stopPropagation(); adminApi.updateChapter(chapter.id, { is_published: !chapter.is_published }).then(onUpdate); }}
                  className="p-2 bg-white hover:bg-slate-50 transition-colors" 
                  style={{ border: "2px solid black", boxShadow: "2px 2px 0px 0px black" }}
                  title={chapter.is_published ? "Ẩn chapter" : "Publish chapter"}
                >
                  <span className="material-symbols-outlined text-sm font-bold" style={{ color: chapter.is_published ? "#2563eb" : "#64748b" }}>
                    {chapter.is_published ? "visibility" : "visibility_off"}
                  </span>
                </button>
                
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm("Xoá chapter này? Toàn bộ lesson và boss bên trong sẽ bị xoá.")) onDelete(chapter.id); }}
                  className="p-2 bg-white hover:bg-red-50 transition-colors" 
                  style={{ border: "2px solid black", boxShadow: "2px 2px 0px 0px black" }}
                  title="Xoá Chapter"
                >
                  <span className="material-symbols-outlined text-sm font-bold" style={{ color: "#dc2626" }}>delete</span>
                </button>
              </>
            )}
          </div>
        </div>

        {expanded && (
          <div style={{ borderTop: "3px solid black", backgroundColor: "#fafaf8" }}>
            {loadingLessons ? (
              <div className="py-6 flex justify-center"><Spinner /></div>
            ) : (
              <div className="flex flex-col">
                {lessons.length === 0 && (
                  <p className="px-6 py-4 text-sm text-slate-500 font-bold text-center">Chưa có bài học nào trong chapter này.</p>
                )}
                
                <div className="divide-y-2 divide-black">
                  {[...lessons].sort((a, b) => a.order_index - b.order_index).map((lesson, idx, arr) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between p-4 bg-[#fdf6e3]/50 hover:bg-white transition-colors group/lesson"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 bg-white flex items-center justify-center text-primary flex-shrink-0" style={{ border: "2px solid black", boxShadow: "2px 2px 0 black" }}>
                          <span className="material-symbols-outlined font-bold">{lesson.action_prompt ? "touch_app" : "play_circle"}</span>
                        </div>
                        
                        <div className="min-w-0 pr-4">
                          <p className="font-black text-sm uppercase truncate">{idx + 1}. {lesson.title}</p>
                          <div className="flex items-center gap-3 mt-1">
                              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                  <span className="material-symbols-outlined text-[14px]">schedule</span> {lesson.video_duration}s
                              </span>
                              <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                  <span className="material-symbols-outlined text-[14px]">{lesson.action_prompt ? "bolt" : "videocam"}</span> {lesson.action_prompt ? "Interactive" : "Video"}
                              </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 hidden md:flex">
                          <span className="text-[10px] font-black uppercase text-slate-500">Trạng thái:</span>
                          <div 
                              className="px-2 py-0.5 text-[10px] font-black uppercase text-white shadow-neo-sm"
                              style={{ border: "2px solid black", boxShadow: "2px 2px 0 black", backgroundColor: lesson.is_published ? "#4ade80" : "#94a3b8" }}
                          >
                              {lesson.is_published ? "Published" : "Draft"}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => openEditModal(lesson)}
                            className="bg-white px-4 py-1.5 text-xs font-black uppercase transition-all hover:translate-x-[1px] hover:translate-y-[1px] shadow-[2px_2px_0_black] hover:shadow-none" 
                            style={{ border: "2px solid black" }}
                          >
                              Chi tiết
                          </button>
                          
                          <button
                            onClick={() => { if (confirm("Xoá bài học này?")) deleteLesson(lesson.id); }}
                            className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 transition-all opacity-0 group-hover/lesson:opacity-100"
                            style={{ border: "2px solid black", boxShadow: "2px 2px 0 black" }}
                            title="Xóa bài học"
                          >
                            <span className="material-symbols-outlined text-[16px] font-bold">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Boss Fight Section Placeholder */}
                <div className="p-6 bg-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between group gap-4">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-primary flex items-center justify-center group-hover:rotate-6 transition-transform flex-shrink-0" style={{ border: "3px solid black", boxShadow: "4px 4px 0 black" }}>
                      <span className="material-symbols-outlined text-3xl font-black">skull</span>
                    </div>
                    <div>
                      <h4 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter">BOSS CỦA CHƯƠNG</h4>
                      <p className="text-sm font-bold text-primary">Yêu cầu: Đạt {chapter.boss_unlock_threshold}% tiến độ</p>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto mt-2 md:mt-0">
                    <div className="text-left md:text-right w-full md:w-auto">
                      <p className="text-[10px] font-black uppercase text-slate-400">Thiết lập Boss</p>
                      <button onClick={() => {
                        // We dispatch a custom event that Admin component listens to
                        window.dispatchEvent(new CustomEvent('NAVIGATE_TO', { detail: 'boss' }));
                      }} className="text-xs font-bold text-slate-500 mt-0.5 hover:text-primary transition-colors cursor-pointer">
                        Vào trang Cài đặt Boss →
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white text-center" style={{ borderTop: "3px solid black" }}>
                    <button onClick={openAddModal} className="font-black uppercase text-xs text-slate-500 hover:text-primary transition-colors flex items-center justify-center gap-2 mx-auto">
                        <span className="material-symbols-outlined text-sm font-bold">add_circle</span>
                        Thêm bài học mới
                    </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Popup Modal Lesson ── */}
      {lessonModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 anim-fadeIn">
          <div className="bg-white w-full max-w-lg flex flex-col anim-scaleIn" style={{ ...neo.card, maxHeight: "92vh" }}>
            {/* Header */}
            <div className="p-4 flex justify-between items-center" style={{ backgroundColor: BG, borderBottom: "3px solid black" }}>
              <div>
                <h3 className="text-base font-black uppercase italic tracking-tight">
                  {lessonModal.editId ? "Chỉnh sửa Lesson" : "Thêm Lesson mới"}
                </h3>
                <p className="text-[11px] text-slate-500 font-bold mt-0.5">Chapter: {chapter.title}</p>
              </div>
              <button onClick={closeModal} className="material-symbols-outlined font-black cursor-pointer hover:text-red-500 transition-colors">
                close
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-black uppercase mb-1">Tiêu đề <span className="text-red-500">*</span></label>
                <input
                  autoFocus
                  className="w-full px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 transition-shadow"
                  placeholder="VD: Xin chào - Cách chào hỏi cơ bản"
                  style={{ border: "2px solid black" }}
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && saveLesson()}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Video URL</label>
                <input
                  className="w-full px-3 py-2 text-sm font-bold focus:outline-none"
                  placeholder="https://www.youtube.com/watch?v=..."
                  style={{ border: "2px solid black" }}
                  value={lessonForm.video_url}
                  onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Thời lượng (giây)</label>
                  <input
                    className="w-full px-3 py-2 text-sm font-bold focus:outline-none"
                    type="number"
                    placeholder="180"
                    style={{ border: "2px solid black" }}
                    value={lessonForm.video_duration}
                    onChange={(e) => setLessonForm({ ...lessonForm, video_duration: +e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Thứ tự</label>
                  <input
                    className="w-full px-3 py-2 text-sm font-bold focus:outline-none"
                    type="number"
                    style={{ border: "2px solid black" }}
                    value={lessonForm.order_index}
                    onChange={(e) => setLessonForm({ ...lessonForm, order_index: +e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Action Prompt (The Loop)</label>
                <textarea
                  className="w-full px-3 py-2 text-sm font-mono focus:outline-none resize-none"
                  rows={3}
                  placeholder="Nhiệm vụ user cần hoàn thành trong cuộc hội thoại với Boss..."
                  style={{ border: "2px solid black" }}
                  value={lessonForm.action_prompt}
                  onChange={(e) => setLessonForm({ ...lessonForm, action_prompt: e.target.value })}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setLessonForm({ ...lessonForm, is_published: !lessonForm.is_published })}
                  className="w-10 h-5 flex-shrink-0 flex items-center px-0.5 transition-colors cursor-pointer"
                  style={{
                    border: "2px solid black",
                    backgroundColor: lessonForm.is_published ? PRIMARY : "#e2e8f0",
                  }}
                >
                  <div
                    className="w-4 h-4 bg-white transition-transform"
                    style={{
                      border: "2px solid black",
                      transform: lessonForm.is_published ? "translateX(18px)" : "translateX(0)",
                    }}
                  />
                </div>
                <span className="text-xs font-black uppercase">
                  {lessonForm.is_published ? "Đã publish (hiện với học viên)" : "Draft (ẩn)"}
                </span>
              </label>
            </div>

            {/* Footer */}
            <div className="p-4 flex gap-3" style={{ borderTop: "3px solid black" }}>
              <button
                onClick={closeModal}
                className="flex-1 font-black text-xs px-4 py-3 uppercase tracking-wider transition-all active:translate-y-0.5 hover:bg-slate-100"
                style={{ border: "2px solid black" }}
              >
                Hủy
              </button>
              <button
                onClick={saveLesson}
                disabled={savingLesson || !lessonForm.title.trim()}
                className="flex-1 flex items-center justify-center gap-1 font-black text-xs px-4 py-3 text-white uppercase tracking-wider transition-all active:translate-y-0.5 disabled:opacity-60"
                style={{ backgroundColor: PRIMARY, border: "2px solid black", boxShadow: "3px 3px 0 black" }}
              >
                {savingLesson ? (
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                ) : (
                  <>{lessonModal.editId ? "Lưu thay đổi" : "Thêm Lesson"}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


function ContentPage() {
  const [chapters, setChapters] = useState<AdminChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    adminApi
      .listChapters()
      .then(setChapters)
      .finally(() => setLoading(false));
  }, []);

  async function createChapter() {
    if (!newTitle.trim()) return;
    try {
      const chapter = await adminApi.createChapter({ title: newTitle, order_index: chapters.length });
      setChapters((c) => [...c, chapter]);
      setNewTitle("");
      setCreating(false);
    } catch (err) {
      handleError(err);
    }
  }

  async function moveChapter(idx: number, dir: -1 | 1) {
    const sorted = [...chapters].sort((a, b) => a.order_index - b.order_index);
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    const a = sorted[idx], b = sorted[targetIdx];
    await Promise.all([
      adminApi.updateChapter(a.id, { order_index: b.order_index }),
      adminApi.updateChapter(b.id, { order_index: a.order_index }),
    ]);
    setChapters((c) =>
      c.map((x) =>
        x.id === a.id ? { ...x, order_index: b.order_index } :
        x.id === b.id ? { ...x, order_index: a.order_index } : x
      )
    );
  }

  if (loading) return <Spinner />;

  const sorted = [...chapters].sort((a, b) => a.order_index - b.order_index);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-xl font-black uppercase tracking-wider">Lộ trình học tập ({chapters.length})</h4>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <input
              className="h-12 px-10 font-bold focus:outline-none focus:ring-0 w-64 bg-white"
              placeholder="Tìm kiếm chương/bài học..."
              type="text"
              style={{ border: "2px solid black", boxShadow: "2px 2px 0px 0px black" }}
            />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">search</span>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 bg-primary text-white px-6 h-12 font-black uppercase transition-all hover:translate-x-[2px] hover:translate-y-[2px]"
            style={{ border: "3px solid black", boxShadow: creating ? "0px 0px 0px 0px black" : "4px 4px 0px 0px black" }}
          >
            <span className="material-symbols-outlined font-bold">add_box</span> Thêm Chương
          </button>
        </div>
      </div>

      {creating && (
        <div className="bg-white p-4 mb-4 flex gap-3 items-center" style={neo.card}>
          <input
            autoFocus
            className="flex-1 px-3 py-2 font-bold focus:outline-none"
            placeholder="Tên chapter..."
            style={{ border: "2px solid black" }}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createChapter()}
          />
          <button
            onClick={createChapter}
            className="font-black text-xs px-3 py-2 text-white"
            style={{ backgroundColor: PRIMARY, border: "2px solid black" }}
          >
            Tạo
          </button>
          <button
            onClick={() => setCreating(false)}
            className="font-black text-xs px-3 py-2"
            style={{ border: "2px solid black" }}
          >
            Huỷ
          </button>
        </div>
      )}

      <div className="grid gap-3">
        {sorted.length === 0 && <p className="text-sm font-bold text-slate-500">Chưa có chapter nào.</p>}
        {sorted.map((chapter, idx) => (
          <ChapterCard
            key={chapter.id}
            chapter={chapter}
            isFirst={idx === 0}
            isLast={idx === sorted.length - 1}
            onMoveUp={() => moveChapter(idx, -1)}
            onMoveDown={() => moveChapter(idx, 1)}
            onUpdate={(updated) => setChapters((c) => c.map((x) => (x.id === updated.id ? updated : x)))}
            onDelete={(id) => {
              adminApi.deleteChapter(id);
              setChapters((c) => c.filter((x) => x.id !== id));
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Sub-page: Boss ───────────────────────────────────────────────────────────

function BossPage() {
  const [bosses, setBosses] = useState<AdminBoss[]>([]);
  const [chapters, setChapters] = useState<AdminChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [chaptersError, setChaptersError] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null); // chapterId being created for
  const [editForm, setEditForm] = useState({
    name: "",
    mission_prompt: "",
    persona_prompt: "",
    gender: "neutral",
    max_turns: 5,
    pass_score: 60,
    avatar_url: "",
    is_published: false,
  });
  const [createForm, setCreateForm] = useState({
    name: "",
    mission_prompt: "",
    persona_prompt: "",
    gender: "neutral",
    max_turns: 5,
    pass_score: 60,
    avatar_url: "",
    is_published: false,
  });

  useEffect(() => {
    // Load chapters and bosses in parallel; chapters failing is critical
    Promise.allSettled([adminApi.listChapters(), adminApi.listBosses()])
      .then(([chaptersResult, bossesResult]) => {
        if (chaptersResult.status === "fulfilled") {
          setChapters(chaptersResult.value);
        } else {
          console.error("Failed to load chapters:", chaptersResult.reason);
          setChaptersError(true);
        }
        if (bossesResult.status === "fulfilled") {
          setBosses(bossesResult.value);
        } else {
          console.warn("Failed to load bosses (non-critical):", bossesResult.reason);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function startEdit(boss: AdminBoss) {
    setEditing(boss.id);
    setEditForm({
      name: boss.name,
      mission_prompt: boss.mission_prompt,
      persona_prompt: boss.persona_prompt,
      gender: boss.gender,
      max_turns: boss.max_turns,
      pass_score: boss.pass_score,
      avatar_url: boss.avatar_url ?? "",
      is_published: boss.is_published,
    });
  }

  async function saveEdit(id: string) {
    try {
      const updated = await adminApi.updateBoss(id, editForm);
      setBosses((b) => b.map((x) => (x.id === id ? updated : x)));
      setEditing(null);
    } catch (err) {
      handleError(err);
    }
  }

  async function deleteBoss(id: string) {
    if (!confirm("Xoá boss này?")) return;
    await adminApi.deleteBoss(id);
    setBosses((b) => b.filter((x) => x.id !== id));
  }

  async function saveCreate(chapterId: string) {
    try {
      const boss = await adminApi.createBoss(chapterId, createForm);
      setBosses((b) => [...b, boss]);
      setCreating(null);
      setCreateForm({
        name: "",
        mission_prompt: "",
        persona_prompt: "",
        gender: "neutral",
        max_turns: 5,
        pass_score: 60,
        avatar_url: "",
        is_published: false,
      });
    } catch (err) {
      handleError(err);
    }
  }

  if (loading) return <Spinner />;

  const bossMap = Object.fromEntries(bosses.map((b) => [b.chapter_id, b]));

  if (editing || (creating && creating !== "preview")) {
    const isCreating = !!creating && creating !== "preview";
    const form = isCreating ? createForm : editForm;
    const setForm = isCreating ? setCreateForm : setEditForm;
    const handleSave = () => isCreating ? saveCreate(creating as string) : saveEdit(editing as string);
    const handleCancel = () => { setEditing(null); setCreating(null); };
    const handleDelete = () => { if (editing && confirm("Xoá boss này?")) { adminApi.deleteBoss(editing); setBosses(b => b.filter(x => x.id !== editing)); setEditing(null); } };

    const labelStyle = "block text-[11px] font-black uppercase mb-1.5 text-[#0f172a] tracking-widest";
    const inputStyle = "w-full px-3 py-2.5 font-bold focus:outline-none bg-white text-[14px] focus:ring-2 focus:ring-orange-400 transition-shadow";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 anim-fadeIn">
        <div className="bg-white w-full max-w-3xl flex flex-col anim-scaleIn" style={{ border: "3px solid black", boxShadow: "8px 8px 0px 0px black", maxHeight: "90vh" }}>

          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ backgroundColor: "#fdf6e3", borderBottom: "3px solid black" }}>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">
                <span style={{ color: PRIMARY }}>Boss Fight</span>
                <span className="material-symbols-outlined text-[13px]">chevron_right</span>
                <span>{isCreating ? "Tạo Boss mới" : "Chỉnh sửa Boss"}</span>
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter">
                {isCreating ? "Tạo Boss Fight mới" : "Cài Đặt Boss Fight"}
              </h3>
            </div>
            <button onClick={handleCancel} className="material-symbols-outlined font-black text-slate-400 hover:text-red-500 transition-colors cursor-pointer" style={{ fontSize: "24px" }}>
              close
            </button>
          </div>

          {/* Modal Body - scrollable */}
          <div className="overflow-y-auto flex-1 p-6 space-y-5">

            {/* Name + Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelStyle}>Boss Name <span className="text-red-500">*</span></label>
                <input className={inputStyle} style={{ border: "2px solid black" }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mr. Garrison" />
              </div>
              <div>
                <label className={labelStyle}>Role / Occupation</label>
                <input className={inputStyle} style={{ border: "2px solid black" }} value={form.mission_prompt} onChange={(e) => setForm({ ...form, mission_prompt: e.target.value })} placeholder="Strict Teacher" />
              </div>
            </div>

            {/* Tone of Voice */}
            <div>
              <label className={labelStyle}>Tone of Voice</label>
              <div className="flex gap-3">
                {[{id: 'male', label: 'Aggressive', icon: 'mood_bad'}, {id: 'female', label: 'Polite', icon: 'sentiment_satisfied'}, {id: 'neutral', label: 'Professional', icon: 'sentiment_neutral'}].map(g => {
                  const isActive = form.gender === g.id;
                  return (
                    <label key={g.id} className="flex-1 cursor-pointer">
                      <input type="radio" name="boss_gender_modal" value={g.id} checked={isActive} onChange={(e) => setForm({...form, gender: e.target.value})} className="hidden" />
                      <div className="flex flex-col items-center gap-1 p-3 transition-all" style={{ border: isActive ? `2px solid ${PRIMARY}` : "2px solid black", backgroundColor: isActive ? "#fff7ed" : "white" }}>
                        <span className="material-symbols-outlined text-[22px]" style={{ color: isActive ? PRIMARY : "#64748b" }}>{g.icon}</span>
                        <span className="font-bold text-[12px] text-center" style={{ color: isActive ? PRIMARY : "#0f172a" }}>{g.label}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Persona Prompt */}
            <div>
              <label className={labelStyle}>Persona System Prompt</label>
              <textarea className={inputStyle} rows={5} style={{ border: "2px solid black", resize: "none", lineHeight: "1.6" }}
                value={form.persona_prompt}
                onChange={(e) => setForm({...form, persona_prompt: e.target.value})}
                placeholder="You are Mr. Garrison, a strict teacher with 30 years of experience who has no patience..." />
              <p className="text-[10px] font-black uppercase text-slate-400 mt-1.5 tracking-widest">Pro Tip: Include specific catchphrases and logical constraints for the AI.</p>
            </div>

            {/* Avatar + URL */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 flex-shrink-0 overflow-hidden flex items-center justify-center text-3xl font-black text-slate-300 bg-slate-100"
                   style={{ border: "3px solid black", boxShadow: "3px 3px 0 black" }}>
                {form.avatar_url
                  ? <img src={form.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                  : <span className="material-symbols-outlined text-[40px] text-slate-300">face</span>}
              </div>
              <div className="flex-1">
                <label className={labelStyle}>Boss Avatar URL</label>
                <input className={inputStyle} style={{ border: "2px solid black" }}
                  value={form.avatar_url}
                  onChange={(e) => setForm({...form, avatar_url: e.target.value})}
                  placeholder="https://... (512×512 PNG recommended)" />
              </div>
            </div>

            {/* Challenge Logic */}
            <div className="p-4 bg-slate-50" style={{ border: "2px solid black" }}>
              <p className="text-[11px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">tune</span> Challenge Logic
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className={`${labelStyle} mb-0`}>Max Turns</label>
                    <span className="text-2xl font-black" style={{ color: PRIMARY }}>{form.max_turns}</span>
                  </div>
                  <div className="h-3 bg-slate-800 w-full relative flex items-center" style={{ border: "2px solid black" }}>
                    <input type="range" min="1" max="20" value={form.max_turns}
                      onChange={e => setForm({...form, max_turns: +e.target.value})}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer z-10" />
                    <div className="absolute h-5 w-5 transition-all" style={{ left: `calc(${(form.max_turns - 1) / 19 * 100}% - 10px)`, border: "2px solid black", backgroundColor: PRIMARY }} />
                  </div>
                </div>
                <div>
                  <label className={labelStyle}>Pass Score</label>
                  <div className="flex items-center bg-white" style={{ border: "2px solid black" }}>
                    {[20, 40, 60, 80, 100].map((score) => {
                      const isActive = form.pass_score >= score;
                      return (
                        <div key={score} className="flex-1 flex items-center justify-center py-2.5 cursor-pointer hover:bg-orange-50 transition-colors border-r-2 border-black last:border-r-0"
                          onClick={() => setForm({...form, pass_score: score})}>
                          <span className="material-symbols-outlined text-2xl" style={{ color: isActive ? PRIMARY : "#e2e8f0", fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">{Math.max(1, Math.floor(form.pass_score / 20))}/5 sao để qua Boss</p>
                </div>
              </div>
            </div>

            {/* Published toggle */}
            <div className="flex items-center justify-between p-4 bg-white cursor-pointer"
              style={{ border: "2px solid black" }}
              onClick={() => setForm({...form, is_published: !form.is_published})}>
              <div>
                <p className="text-[13px] font-black uppercase">{form.is_published ? "✅ Published (Học viên thấy được)" : "Draft (Ẩn với học viên)"}</p>
                <p className="text-[11px] text-slate-500 font-bold mt-0.5">{form.is_published ? "Boss này đang hoạt động" : "Boss chưa được bật lên"}</p>
              </div>
              <div className="w-12 h-6 flex-shrink-0 flex items-center px-0.5 transition-colors" style={{ border: "2px solid black", backgroundColor: form.is_published ? PRIMARY : "#e2e8f0" }}>
                <div className="w-4 h-4 bg-white transition-transform" style={{ border: "2px solid black", transform: form.is_published ? "translateX(24px)" : "translateX(0)" }} />
              </div>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: "3px solid black", backgroundColor: "#fdf6e3" }}>
            {!isCreating && (
              <button onClick={handleDelete} className="flex items-center gap-1.5 font-black uppercase text-xs px-4 py-2.5 text-red-500 hover:bg-red-50 transition-colors mr-auto" style={{ border: "2px solid #ef4444" }}>
                <span className="material-symbols-outlined text-[16px]">delete_forever</span> Xoá Boss
              </button>
            )}
            <button onClick={handleCancel} className="font-black text-xs px-5 py-2.5 uppercase tracking-wider hover:bg-slate-100 transition-colors" style={{ border: "2px solid black" }}>
              Huỷ
            </button>
            <button onClick={handleSave} disabled={!form.name.trim()} className="flex items-center justify-center gap-1.5 font-black text-xs px-6 py-2.5 text-white uppercase tracking-wider disabled:opacity-50 transition-all hover:brightness-110" style={{ backgroundColor: PRIMARY, border: "2px solid black", boxShadow: "2px 2px 0 black" }}>
              <span className="material-symbols-outlined text-[16px]">save</span>
              {isCreating ? "Tạo Boss" : "Lưu thay đổi"}
            </button>
          </div>

        </div>
      </div>
    );
  }



  return (
    <div className="grid gap-4">
      {chaptersError && (
        <div className="p-6 bg-red-50 flex items-center gap-4" style={{ border: "3px solid #ef4444", boxShadow: "4px 4px 0px 0px #ef4444" }}>
          <span className="material-symbols-outlined text-3xl text-red-500">error</span>
          <div>
            <p className="font-black text-red-700 uppercase">Lỗi tải dữ liệu!</p>
            <p className="text-sm font-bold text-red-500 mt-1">Không thể kết nối đến server. Hãy kiểm tra backend đang chạy và thử tải lại trang.</p>
          </div>
        </div>
      )}
      {!chaptersError && chapters.length === 0 && !loading && (
        <div className="p-10 text-center bg-white" style={{ border: "3px solid black", boxShadow: "4px 4px 0px 0px black" }}>
          <span className="material-symbols-outlined text-[64px] font-black text-slate-200 mb-4 inline-block">sports_martial_arts</span>
          <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Chưa có Chapter nào</h3>
          <p className="font-bold text-slate-500 max-w-md mx-auto">Bạn cần tạo ít nhất một Chapter (bên trang Bài học) để có thể gán Boss Fight vào cuối Chapter đó.</p>
        </div>
      )}
      {chapters.map((chapter) => {
        const boss = bossMap[chapter.id];
        return (
          <div key={chapter.id} className="bg-white overflow-hidden" style={neo.card}>
            <div
              className="px-4 py-2 flex items-center gap-2"
              style={{ borderBottom: "2px solid black", backgroundColor: "#f8f4ec" }}
            >
              <span className="text-xs font-black uppercase text-slate-500">Chapter {chapter.order_index + 1}</span>
              <span className="font-black text-sm">{chapter.title}</span>
            </div>
            {boss ? (
                <div className="p-5 flex items-start gap-4">
                  <div
                    className="w-16 h-16 flex-shrink-0 rounded-none overflow-hidden flex items-center justify-center font-black text-lg bg-slate-200"
                    style={{ border: "3px solid black", boxShadow: "4px 4px 0 black" }}
                  >
                    {boss.avatar_url ? (
                      <img src={boss.avatar_url} className="w-full h-full object-cover" alt={boss.name} />
                    ) : (
                      boss.name.charAt(0)
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-extrabold text-xl uppercase italic tracking-tighter">{boss.name}</p>
                      <span
                        className="text-[10px] font-black px-2 py-0.5 uppercase tracking-widest bg-white"
                        style={{ border: "2px solid black" }}
                      >
                        {boss.max_turns} turns
                      </span>
                      <span
                        className="text-[10px] font-black px-2 py-0.5 uppercase tracking-widest bg-white"
                        style={{ border: "2px solid black" }}
                      >
                        pass {Math.max(1, Math.floor(boss.pass_score/20))}/5
                      </span>
                      {boss.is_published && (
                        <span
                          className="text-[10px] font-black px-2 py-0.5 uppercase tracking-widest text-[#4ade80]"
                          style={{ border: "2px solid black", backgroundColor: "white" }}
                        >
                          Published
                        </span>
                      )}
                    </div>
                    {boss.mission_prompt && (
                      <p className="text-[13px] font-bold text-primary mt-1 line-clamp-1">✦ {boss.mission_prompt}</p>
                    )}
                    <p className="text-xs font-medium text-slate-600 mt-1 line-clamp-2">{boss.persona_prompt}</p>
                  </div>
                  <div className="flex flex-col gap-2 relative z-10">
                    <button
                      onClick={() => startEdit(boss)}
                      className="bg-white flex items-center justify-center px-4 py-2 hover:bg-slate-50 transition-colors shadow-[2px_2px_0px_0px_black] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                      style={{ border: "2px solid black" }}
                      title="Settings"
                    >
                      <span className="material-symbols-outlined text-[16px] font-black">settings</span>
                    </button>
                    <button
                       onClick={() => deleteBoss(boss.id)}
                       className="bg-red-50 flex items-center justify-center px-4 py-2 hover:bg-red-100 transition-colors shadow-[2px_2px_0px_0px_black] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
                       style={{ border: "2px solid black" }}
                       title="Archive"
                     >
                       <span className="material-symbols-outlined text-[16px] font-black text-red-500">delete</span>
                    </button>
                  </div>
                </div>
            ) : creating === chapter.id ? (
               <div />
            ) : (
              <button
                onClick={() => setCreating(chapter.id)}
                className="w-full flex items-center justify-center gap-2 py-4 text-sm font-black text-slate-400 hover:text-black hover:bg-orange-50 transition-colors"
              >
                <span className="material-symbols-outlined text-base">add_circle</span> Tạo Boss cho chapter này
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Sub-page: Achievements ───────────────────────────────────────────────────

function AchievementsPage() {
  const [achievements, setAchievements] = useState<AdminAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const editOpen = editing !== null;
  const blankForm = { name: "", description: "", icon_url: "", condition_type: "streak", condition_value: 7 };
  const [form, setForm] = useState(blankForm);
  const [createForm, setCreateForm] = useState({ code: "", ...blankForm });

  useEffect(() => {
    adminApi
      .listAchievements()
      .then(setAchievements)
      .finally(() => setLoading(false));
  }, []);

  async function saveEdit(id: string) {
    try {
      const updated = await adminApi.updateAchievement(id, form);
      setAchievements((a) => a.map((x) => (x.id === id ? updated : x)));
      setEditing(null);
    } catch (err) {
      handleError(err);
    }
  }

  async function saveCreate() {
    if (!createForm.code.trim() || !createForm.name.trim()) return;
    try {
      const created = await adminApi.createAchievement(createForm);
      setAchievements((a) => [...a, created]);
      setCreating(false);
      setCreateForm({ code: "", ...blankForm });
    } catch (err) {
      handleError(err);
    }
  }

  async function deleteAchievement(id: string) {
    if (!confirm("Xoá thành tựu này?")) return;
    await adminApi.deleteAchievement(id);
    setAchievements((a) => a.filter((x) => x.id !== id));
  }

  const conditionTypes = ["streak", "scenes_completed", "total_stars"];

  function AchievementForm({
    f,
    setF,
    codeField = false,
    onSave,
    onCancel,
  }: {
    f: Record<string, unknown>;
    setF: (v: Record<string, unknown>) => void;
    codeField?: boolean;
    onSave: () => void;
    onCancel: () => void;
  }) {
    return (
      <div className="space-y-2 p-4" style={{ borderTop: "2px solid black", backgroundColor: "#fafaf8" }}>
        {codeField && (
          <input
            className="w-full px-2 py-1.5 text-sm font-mono font-bold focus:outline-none"
            placeholder="code (unique, e.g. streak_7_days)"
            style={{ border: "2px solid black" }}
            value={f.code as string}
            onChange={(e) => setF({ ...f, code: e.target.value })}
          />
        )}
        <div className="flex gap-2">
          <input
            className="flex-1 px-2 py-1.5 text-sm font-bold focus:outline-none"
            placeholder="Tên thành tựu"
            style={{ border: "2px solid black" }}
            value={f.name as string}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
          <input
            className="w-24 px-2 py-1.5 text-sm font-bold focus:outline-none"
            placeholder="Icon URL"
            style={{ border: "2px solid black" }}
            value={f.icon_url as string}
            onChange={(e) => setF({ ...f, icon_url: e.target.value })}
          />
        </div>
        <textarea
          className="w-full px-2 py-1.5 text-sm focus:outline-none"
          rows={2}
          placeholder="Mô tả..."
          style={{ border: "2px solid black" }}
          value={f.description as string}
          onChange={(e) => setF({ ...f, description: e.target.value })}
        />
        <div className="flex gap-2">
          <select
            className="flex-1 px-2 py-1.5 text-sm font-bold focus:outline-none"
            style={{ border: "2px solid black" }}
            value={f.condition_type as string}
            onChange={(e) => setF({ ...f, condition_type: e.target.value })}
          >
            {conditionTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            className="w-24 px-2 py-1.5 text-sm font-bold focus:outline-none"
            type="number"
            placeholder="Giá trị"
            style={{ border: "2px solid black" }}
            value={f.condition_value as number}
            onChange={(e) => setF({ ...f, condition_value: +e.target.value })}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onSave}
            className="text-xs font-black px-3 py-1.5 text-white"
            style={{ backgroundColor: PRIMARY, border: "2px solid black" }}
          >
            Lưu
          </button>
          <button onClick={onCancel} className="text-xs font-black px-3 py-1.5" style={{ border: "2px solid black" }}>
            Huỷ
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-black uppercase tracking-wider italic">Thành tựu ({achievements.length})</h4>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 text-xs font-black px-3 py-2 text-white"
          style={{ backgroundColor: PRIMARY, ...neo.btn }}
        >
          <span className="material-symbols-outlined text-sm">add</span> Thêm thành tựu
        </button>
      </div>

      <Dialog
        open={creating}
        onOpenChange={(open) => {
          setCreating(open);
          if (!open) setCreateForm({ code: "", ...blankForm });
        }}
      >
        <DialogContent className="p-0 overflow-hidden" style={neo.card}>
          <DialogHeader className="px-4 py-3" style={{ borderBottom: "2px solid black", backgroundColor: "#f8f4ec" }}>
            <DialogTitle className="text-xs font-black uppercase tracking-wider italic">Thành tựu mới</DialogTitle>
            <DialogDescription className="text-[11px] font-bold text-slate-500">
              Tạo achievement mới (code phải unique).
            </DialogDescription>
          </DialogHeader>
          <AchievementForm
            f={createForm as Record<string, unknown>}
            setF={(v) => setCreateForm(v as typeof createForm)}
            codeField
            onSave={saveCreate}
            onCancel={() => setCreating(false)}
          />
        </DialogContent>
      </Dialog>

      <div className="grid gap-3">
        {achievements.length === 0 && !creating && (
          <p className="text-sm font-bold text-slate-500">Chưa có thành tựu nào.</p>
        )}
        {achievements.map((a) => (
          <div key={a.id} className="bg-white overflow-hidden" style={neo.card}>
            <div className="p-4 flex items-start gap-4">
              <div
                className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-2xl"
                style={{ border: "2px solid black", backgroundColor: "#f8f4ec" }}
              >
                {a.icon_url ? <img src={a.icon_url} className="w-full h-full object-cover" alt="" /> : "🏆"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-black">{a.name}</p>
                  <code
                    className="text-[10px] font-mono px-1.5 py-0.5"
                    style={{ border: "1px solid black", backgroundColor: "#f8f4ec" }}
                  >
                    {a.code}
                  </code>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{a.description}</p>
                <p className="text-[10px] font-black text-slate-400 mt-1 uppercase">
                  {a.condition_type} ≥ {a.condition_value}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => {
                    setEditing(a.id);
                    setForm({
                      name: a.name,
                      description: a.description,
                      icon_url: a.icon_url ?? "",
                      condition_type: a.condition_type,
                      condition_value: a.condition_value,
                    });
                  }}
                  className="material-symbols-outlined text-slate-400 hover:text-black font-bold"
                >
                  edit
                </button>
                <button
                  onClick={() => deleteAchievement(a.id)}
                  className="material-symbols-outlined text-red-400 hover:text-red-600 font-bold"
                >
                  delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="p-0 overflow-hidden" style={neo.card}>
          <DialogHeader className="px-4 py-3" style={{ borderBottom: "2px solid black", backgroundColor: "#f8f4ec" }}>
            <DialogTitle className="text-xs font-black uppercase tracking-wider italic">Sửa thành tựu</DialogTitle>
            <DialogDescription className="text-[11px] font-bold text-slate-500">
              Cập nhật thông tin achievement.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <AchievementForm
              f={form as Record<string, unknown>}
              setF={(v) => setForm(v as typeof form)}
              onSave={() => saveEdit(editing)}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-page: Conversations ──────────────────────────────────────────────────

function ConversationsPage() {
  const [convs, setConvs] = useState<AdminConversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .listConversations(0, 50)
      .then(setConvs)
      .finally(() => setLoading(false));
  }, []);

  const statusColor: Record<string, string> = { completed: "black", active: PRIMARY, abandoned: "#94a3b8" };
  const statusLabel: Record<string, string> = { completed: "Hoàn thành", active: "Đang đấu", abandoned: "Bỏ cuộc" };

  if (loading) return <Spinner />;

  return (
    <div className="bg-white overflow-hidden" style={neo.card}>
      <div className="p-4 bg-slate-50" style={{ borderBottom: "3px solid black" }}>
        <h4 className="text-sm font-black uppercase tracking-wider italic">Boss Fight Log ({convs.length})</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr
              className="bg-slate-100 text-xs font-black uppercase tracking-wider"
              style={{ borderBottom: "3px solid black" }}
            >
              <th className="px-4 py-3">Người dùng</th>
              <th className="px-4 py-3">Boss</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Bắt đầu</th>
              <th className="px-4 py-3">Kết thúc</th>
            </tr>
          </thead>
          <tbody>
            {convs.map((c) => (
              <tr
                key={c.id}
                className="hover:bg-orange-50 transition-colors"
                style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}
              >
                <td className="px-4 py-3 font-bold text-sm">{c.user_name}</td>
                <td className="px-4 py-3 font-bold text-sm italic">{c.boss_name}</td>
                <td className="px-4 py-3">
                  <span
                    className="text-[10px] font-black px-2 py-0.5 uppercase text-white"
                    style={{ backgroundColor: statusColor[c.status] ?? "#94a3b8" }}
                  >
                    {statusLabel[c.status] ?? c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{timeAgo(c.started_at)}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{c.ended_at ? timeAgo(c.ended_at) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Sub-page: Payments ───────────────────────────────────────────────────────

function PaymentsPage() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .listPayments()
      .then(setPayments)
      .finally(() => setLoading(false));
  }, []);

  const statusColor: Record<string, string> = {
    paid: "black",
    pending: PRIMARY,
    failed: "#dc2626",
    cancelled: "#94a3b8",
  };
  const totalRevenue = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount_vnd, 0);

  if (loading) return <Spinner />;

  return (
    <>
      <div className="bg-white p-4 mb-4 inline-flex items-center gap-3" style={neo.card}>
        <span className="text-sm font-black text-slate-500 uppercase">Tổng doanh thu (đã thanh toán)</span>
        <span className="text-2xl font-black" style={{ color: PRIMARY }}>
          {fmtVnd(totalRevenue)} VNĐ
        </span>
      </div>
      <div className="bg-white overflow-hidden" style={neo.card}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr
                className="bg-slate-100 text-xs font-black uppercase tracking-wider"
                style={{ borderBottom: "3px solid black" }}
              >
                <th className="px-4 py-3">User ID</th>
                <th className="px-4 py-3">Gói</th>
                <th className="px-4 py-3">Số tiền</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3">Thanh toán</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-orange-50" style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono">{p.user_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3 font-bold uppercase text-sm">{p.plan}</td>
                  <td className="px-4 py-3 font-black">{p.amount_vnd.toLocaleString()}đ</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-[10px] font-black px-2 py-0.5 uppercase text-white"
                      style={{ backgroundColor: statusColor[p.status] ?? "#94a3b8" }}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(p.created_at).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {p.paid_at ? new Date(p.paid_at).toLocaleDateString("vi-VN") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function Admin() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [adminName, setAdminName] = useState("Admin");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setAdminName(data.user.user_metadata?.display_name ?? data.user.email ?? "Admin");
    });

    const handleNavigate = (e: Event) => {
       const customEvent = e as CustomEvent<string>;
       if (customEvent.detail && navItems.some(i => i.key === customEvent.detail)) {
          setActiveNav(customEvent.detail);
       }
    };
    window.addEventListener('NAVIGATE_TO', handleNavigate);
    return () => window.removeEventListener('NAVIGATE_TO', handleNavigate);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/auth");
  }

  const page = pageTitles[activeNav] ?? pageTitles.dashboard;

  return (
    <div className="flex min-h-screen text-slate-900 font-sans" style={{ backgroundColor: "#fdf6e3" }}>
      {/* Sidebar */}
      <aside
        className={`${collapsed ? "w-20" : "w-72"} flex flex-col fixed h-full z-20 transition-all duration-200`}
        style={{ backgroundColor: "#fdf6e3", borderRight: "3px solid black" }}
      >
        {/* Logo row */}
        <div className={`h-[104px] px-6 border-b-[3px] border-black flex items-center ${collapsed ? "justify-center px-4" : "justify-between gap-4"}`}>
          {!collapsed && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/")}
                className="w-12 h-12 flex items-center justify-center bg-primary text-white hover:brightness-110 transition-all flex-shrink-0"
                style={{ border: "2px solid black", boxShadow: "2px 2px 0px 0px black" }}
                title="Về trang học"
              >
                <span className="text-[28px] font-black">T</span>
              </button>
              <div>
                <h1 className="text-xl font-black uppercase tracking-tight leading-none text-[#0f172a] cursor-pointer" onClick={() => navigate("/")}>TALKI ADMIN</h1>
                <p className="text-[11px] font-bold uppercase text-primary mt-1">Hệ thống quản lý</p>
              </div>
            </div>
          )}
          {collapsed && (
              <button
                onClick={() => navigate("/")}
                className="w-12 h-12 flex items-center justify-center bg-primary text-white hover:brightness-110 transition-all flex-shrink-0"
                style={{ border: "2px solid black", boxShadow: "2px 2px 0px 0px black" }}
                title="Về trang học"
              >
                <span className="text-[28px] font-black">T</span>
              </button>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-5 flex flex-col gap-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeNav === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveNav(item.key)}
                className={`flex items-center ${collapsed ? "justify-center" : "gap-4 px-4"} py-3 w-full text-left transition-colors font-black`}
                title={collapsed ? item.label : undefined}
                style={{
                  backgroundColor: isActive ? PRIMARY : "transparent",
                  color: isActive ? "white" : "#0f172a",
                  border: isActive ? "3px solid black" : "3px solid transparent",
                  boxShadow: isActive ? "3px 3px 0px 0px black" : "none",
                }}
              >
                <span className={`material-symbols-outlined font-black flex-shrink-0 text-[20px] ${!isActive && 'text-[#1e293b]'}`}>{item.icon}</span>
                {!collapsed && <span className="text-[15px] font-extrabold">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-5" style={{ borderTop: "3px solid black" }}>
          <div
            className={`flex items-center p-3 w-full bg-white ${collapsed ? "justify-center" : "gap-4"}`}
            style={{ border: "2px solid black", boxShadow: "2px 2px 0px 0px black" }}
          >
            <div
              className={`w-10 h-10 flex items-center justify-center font-black text-xl flex-shrink-0 bg-[#e2e8f0] ${collapsed && 'cursor-pointer hover:bg-slate-300'}`}
              style={{ border: "2px solid black", color: "#0f172a" }}
              title={collapsed ? "Đăng xuất" : undefined}
              onClick={collapsed ? handleLogout : undefined}
            >
              {adminName.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1 overflow-hidden cursor-pointer" onClick={handleLogout} title="Click để đăng xuất">
                <p className="text-sm font-black truncate text-slate-900">{adminName}</p>
                <p className="text-[11px] font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase mt-0.5">Đăng xuất</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className={`${collapsed ? "ml-20" : "ml-72"} flex-1 transition-all duration-200`}>
        {/* Header */}
        <header className="bg-white sticky top-0 z-10 h-[104px] px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center hover:bg-slate-100 transition-colors bg-white mr-2"
              style={{ border: "2px solid black", boxShadow: "2px 2px 0 black" }}
              title="Thu/Mở Menu"
            >
              <span className="material-symbols-outlined text-lg font-bold">{collapsed ? "menu_open" : "menu"}</span>
            </button>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter">{page.title}</h2>
              <p className="font-bold text-slate-500 mt-1">{page.sub}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="bg-white p-3 flex items-center hover:bg-slate-50 transition-colors" style={{ border: "3px solid black", boxShadow: "4px 4px 0px 0px black" }} title="Thông báo">
              <span className="material-symbols-outlined font-black">notifications</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
        {activeNav === "dashboard" && <DashboardPage />}
        {activeNav === "users" && <UsersPage />}
        {activeNav === "content" && <ContentPage />}
        {activeNav === "boss" && <BossPage />}
        {activeNav === "conversations" && <ConversationsPage />}
        {activeNav === "payment" && <PaymentsPage />}
        {activeNav === "achievements" && <AchievementsPage />}
        </div>
      </main>
    </div>
  );
}
