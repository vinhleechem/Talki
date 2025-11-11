import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Sparkles } from "lucide-react";

const Login = () => {
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      // Store user name in localStorage for now
      localStorage.setItem("userName", name);
      navigate("/roadmap");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary neo-border neo-shadow-lg rounded-sm mb-4">
            <MessageCircle className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-foreground mb-2">Talki</h1>
          <p className="text-lg font-bold text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Trò chuyện, chill cùng Talki nào!
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-card neo-border neo-shadow-lg rounded-sm p-6 sm:p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-foreground mb-2">
                Tên của bạn
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Nhập tên của bạn..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="neo-border focus:ring-2 focus:ring-primary rounded-sm font-medium"
                required
              />
            </div>

            <Button type="submit" variant="hero" className="w-full" size="lg">
              Bắt đầu ngay! 🚀
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs font-medium text-muted-foreground">
              Luyện giao tiếp tự tin, tự nhiên cùng AI
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          {[
            { emoji: "💬", text: "Giao tiếp" },
            { emoji: "🎯", text: "Thực hành" },
            { emoji: "⭐", text: "Tự tin" },
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-card neo-border neo-shadow rounded-sm p-3 text-center hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
            >
              <div className="text-2xl mb-1">{feature.emoji}</div>
              <div className="text-xs font-bold">{feature.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Login;
