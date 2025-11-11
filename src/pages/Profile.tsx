import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Mail, Calendar, LogOut, Edit2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useProgress } from "@/hooks/useProgress";
import { useToast } from "@/components/ui/use-toast";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { progress } = useProgress();
  const [isEditing, setIsEditing] = useState(false);
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.name || "User");
        setEmail(user.email || "");
      }
    };
    fetchUserData();
  }, []);

  const handleSave = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: userName }
      });

      if (error) throw error;

      localStorage.setItem("userName", userName);
      setIsEditing(false);
      
      toast({
        title: "Profile updated!",
        description: "Your name has been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("userName");
    navigate("/");
  };

  const completedScenes = progress.filter(p => p.completed).length;

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
                  <p className="font-bold text-foreground">{email}</p>
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
            <div className="text-3xl font-black text-primary mb-1">{completedScenes}</div>
            <div className="text-sm font-bold text-muted-foreground">Scenes Completed</div>
          </div>
          <div className="bg-card neo-border neo-shadow rounded-sm p-6 text-center">
            <div className="text-3xl font-black text-secondary mb-1">
              {progress.reduce((sum, p) => sum + (p.stars || 0), 0)}
            </div>
            <div className="text-sm font-bold text-muted-foreground">Total Stars</div>
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
