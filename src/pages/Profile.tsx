import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Mail, Calendar, LogOut, Edit2 } from "lucide-react";
import Navbar from "@/components/Navbar";

const Profile = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [userName, setUserName] = useState(localStorage.getItem("userName") || "");

  const handleSave = () => {
    localStorage.setItem("userName", userName);
    setIsEditing(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("userName");
    navigate("/");
  };

  return (
    <div className="min-h-screen pb-20">
      <Navbar />

      <div className="container mx-auto px-4 pt-24 max-w-2xl">
        {/* Profile Card */}
        <div className="bg-card neo-border neo-shadow rounded-sm p-8 mb-6">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 bg-primary neo-border neo-shadow rounded-sm flex items-center justify-center mb-4">
              <User className="w-12 h-12 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-black text-foreground">{userName}</h1>
            <p className="text-sm font-bold text-muted-foreground">Học viên Talki</p>
          </div>

          {/* Info */}
          <div className="space-y-4">
            <div className="bg-muted neo-border rounded-sm p-4">
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <div className="flex-1">
                    <Input
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="neo-border rounded-sm font-medium"
                      placeholder="Nhập tên của bạn"
                    />
                  </div>
                ) : (
                  <>
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-muted-foreground">Tên</p>
                      <p className="font-bold text-foreground">{userName}</p>
                    </div>
                  </>
                )}
                {!isEditing && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-muted neo-border rounded-sm p-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs font-bold text-muted-foreground">Email</p>
                  <p className="font-bold text-foreground">user@talki.app</p>
                </div>
              </div>
            </div>

            <div className="bg-muted neo-border rounded-sm p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs font-bold text-muted-foreground">Tham gia</p>
                  <p className="font-bold text-foreground">Tháng 10, 2025</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {isEditing && (
            <div className="flex gap-4 mt-6">
              <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                Hủy
              </Button>
              <Button variant="secondary" onClick={handleSave} className="flex-1">
                Lưu thay đổi
              </Button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-card neo-border neo-shadow rounded-sm p-6 text-center">
            <div className="text-3xl font-black text-primary mb-1">7</div>
            <div className="text-sm font-bold text-muted-foreground">Ngày streak</div>
          </div>
          <div className="bg-card neo-border neo-shadow rounded-sm p-6 text-center">
            <div className="text-3xl font-black text-secondary mb-1">12</div>
            <div className="text-sm font-bold text-muted-foreground">Cảnh hoàn thành</div>
          </div>
        </div>

        {/* Logout */}
        <Button
          variant="destructive"
          onClick={handleLogout}
          className="w-full"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Đăng xuất
        </Button>
      </div>
    </div>
  );
};

export default Profile;
