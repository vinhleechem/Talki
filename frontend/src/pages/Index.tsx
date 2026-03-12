import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Brain, MessageCircle, Mic, PlayCircle, ShieldCheck, Sparkles, Target, Trophy } from "lucide-react";

const highlights = [
  {
    icon: Mic,
    title: "Luyện nói với AI",
    description: "Thực hành hội thoại theo tình huống thật để nói tự nhiên và bớt run hơn mỗi ngày.",
  },
  {
    icon: Target,
    title: "Lộ trình rõ ràng",
    description: "Học từ kỹ năng giao tiếp cơ bản đến thuyết trình và xử lý các tình huống áp lực.",
  },
  {
    icon: Trophy,
    title: "Boss Fight thử thách",
    description: "Đối thoại với AI có cá tính mạnh như HR khó tính hoặc sếp khó chiều để nâng bản lĩnh.",
  },
];

const steps = [
  {
    icon: PlayCircle,
    title: "1. Xem lý thuyết ngắn gọn",
    description: "Nắm các nguyên tắc giao tiếp thực tế qua nội dung ngắn, dễ hiểu và dễ áp dụng.",
  },
  {
    icon: Brain,
    title: "2. Thực hành theo tình huống",
    description: "Ôn lại bằng bài luyện tương tác để biến kiến thức thành phản xạ giao tiếp.",
  },
  {
    icon: ShieldCheck,
    title: "3. Vào boss fight",
    description: "Đối mặt với các kịch bản khó và nhận đánh giá để biết mình cần cải thiện ở đâu.",
  },
];

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Chào mừng trở lại!",
          description: "Đăng nhập thành công.",
        });

        setAuthOpen(false);
        navigate("/roadmap");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
            },
          },
        });

        if (error) throw error;

        localStorage.setItem("userName", name);

        toast({
          title: "Tạo tài khoản thành công!",
          description: "Bắt đầu hành trình học tập của bạn.",
        });

        setAuthOpen(false);
        navigate("/roadmap");
      }
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openAuthModal = (mode: "login" | "register") => {
    setIsLogin(mode === "login");
    setAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b-4 border-foreground bg-muted/40">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-primary neo-border neo-shadow-sm">
              <MessageCircle className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-black leading-none">Talki</p>
              <p className="text-sm font-bold text-muted-foreground">Nền tảng luyện giao tiếp cùng AI</p>
            </div>
          </div>

          {isAuthenticated ? (
            <Button variant="outline" size="lg" onClick={() => navigate("/roadmap")}>
              Vào học ngay
            </Button>
          ) : (
            <Button variant="outline" size="lg" onClick={() => openAuthModal("login")}>
              Đăng nhập
            </Button>
          )}
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-20">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-sm bg-secondary px-4 py-2 text-sm font-black text-secondary-foreground neo-border neo-shadow-sm">
              <Sparkles className="h-4 w-4" />
              Luyện giao tiếp thực chiến cho học tập và công việc
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl font-black leading-tight sm:text-6xl lg:text-7xl">
                Tự tin nói chuyện, phản hồi và thuyết phục với <span className="text-primary">Talki</span>
              </h1>
              <p className="mx-auto max-w-2xl text-lg font-medium text-muted-foreground lg:mx-0">
                Talki giúp bạn luyện giao tiếp qua video bài học, tình huống tương tác và những màn boss fight với AI để
                bớt ngại, nói mạch lạc hơn và xử lý tốt áp lực khi phỏng vấn, thuyết trình hoặc làm việc nhóm.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              {isAuthenticated ? (
                <Button variant="hero" size="lg" onClick={() => navigate("/roadmap")}>
                  Tiếp tục học tập
                  <ArrowRight className="h-5 w-5" />
                </Button>
              ) : (
                <>
                  <Button variant="hero" size="lg" onClick={() => openAuthModal("register")}>
                    Trải nghiệm ngay
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <a href="#features">Xem điểm nổi bật</a>
                  </Button>
                </>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="bg-card p-5 neo-border neo-shadow">
                <p className="text-3xl font-black text-primary">3 bước</p>
                <p className="mt-2 text-sm font-bold text-muted-foreground">Học - luyện - boss fight</p>
              </Card>
              <Card className="bg-card p-5 neo-border neo-shadow">
                <p className="text-3xl font-black text-secondary">100%</p>
                <p className="mt-2 text-sm font-bold text-muted-foreground">Tập trung vào luyện phản xạ nói</p>
              </Card>
              <Card className="bg-card p-5 neo-border neo-shadow">
                <p className="text-3xl font-black text-accent">AI</p>
                <p className="mt-2 text-sm font-bold text-muted-foreground">Đồng hành đánh giá và phản hồi</p>
              </Card>
            </div>
          </div>

          <Card className="overflow-hidden bg-card neo-border-thick neo-shadow-lg">
            <div className="border-b-4 border-foreground bg-primary p-6 text-primary-foreground">
              <p className="text-sm font-black uppercase tracking-wide">Talki dành cho ai?</p>
              <h2 className="mt-2 text-3xl font-black">Dành cho người muốn nói tốt hơn mỗi ngày</h2>
            </div>
            <div className="space-y-4 p-6">
              <div className="rounded-sm bg-muted p-4 neo-border neo-shadow-sm">
                <p className="font-black">Sinh viên</p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  Luyện phát biểu, thuyết trình và trao đổi trong lớp học tự tin hơn.
                </p>
              </div>
              <div className="rounded-sm bg-muted p-4 neo-border neo-shadow-sm">
                <p className="font-black">Người đi làm</p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  Cải thiện phản hồi, trình bày ý tưởng và giao tiếp trong môi trường áp lực.
                </p>
              </div>
              <div className="rounded-sm bg-muted p-4 neo-border neo-shadow-sm">
                <p className="font-black">Người ngại giao tiếp</p>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  Bắt đầu với những bài luyện an toàn trước khi bước vào tình huống thật.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section id="features" className="border-y-4 border-foreground bg-card">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-4xl font-black">Điểm nổi bật của Talki</h2>
            <p className="mt-3 text-base font-medium text-muted-foreground">
              Không chỉ học lý thuyết, bạn sẽ được thực hành liên tục để tăng phản xạ, sự tự nhiên và độ tự tin khi giao
              tiếp.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <Card key={item.title} className="p-6 neo-border neo-shadow">
                  <div className="flex h-14 w-14 items-center justify-center rounded-sm bg-secondary neo-border neo-shadow-sm">
                    <Icon className="h-7 w-7 text-secondary-foreground" />
                  </div>
                  <h3 className="mt-5 text-2xl font-black">{item.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-muted-foreground">{item.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-4xl font-black">Cách Talki hoạt động</h2>
          <p className="mt-3 text-base font-medium text-muted-foreground">
            Một hành trình đơn giản nhưng đủ thực chiến để bạn thấy sự tiến bộ rõ ràng sau mỗi lần luyện tập.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <Card key={step.title} className="p-6 neo-border neo-shadow">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-primary neo-border neo-shadow-sm">
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-black">{step.title}</h3>
                </div>
                <p className="mt-4 text-sm font-medium leading-6 text-muted-foreground">{step.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="border-t-4 border-foreground bg-muted/40">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <Card className="mx-auto max-w-5xl p-8 text-center neo-border-thick neo-shadow-lg md:p-12">
            <div className="mx-auto inline-flex items-center gap-2 rounded-sm bg-accent px-4 py-2 text-sm font-black text-accent-foreground neo-border neo-shadow-sm">
              <Sparkles className="h-4 w-4" />
              Sẵn sàng bắt đầu hành trình giao tiếp tự tin?
            </div>

            <h2 className="mt-6 text-4xl font-black leading-tight md:text-5xl">
              Tạo tài khoản hoặc đăng nhập khi bạn sẵn sàng bắt đầu
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base font-medium text-muted-foreground">
              Talki giờ sẽ giữ homepage gọn hơn. Chức năng đăng nhập và đăng ký chỉ hiện ra khi bạn bấm nút.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              {isAuthenticated ? (
                <Button variant="hero" size="lg" onClick={() => navigate("/roadmap")}>
                  Vào học ngay
                  <ArrowRight className="h-5 w-5" />
                </Button>
              ) : (
                <>
                  <Button variant="hero" size="lg" onClick={() => openAuthModal("register")}>
                    Đăng ký ngay
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => openAuthModal("login")}>
                    Tôi đã có tài khoản
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      </section>

      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="neo-border-thick neo-shadow-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-black sm:text-center">
              {isLogin ? "Đăng nhập" : "Đăng ký"}
            </DialogTitle>
            <DialogDescription className="text-center text-sm font-medium">
              {isLogin
                ? "Quay lại và tiếp tục hành trình luyện giao tiếp của bạn"
                : "Tạo tài khoản để bắt đầu luyện giao tiếp cùng Talki"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant={isLogin ? "hero" : "outline"} onClick={() => setIsLogin(true)}>
              Đăng nhập
            </Button>
            <Button type="button" variant={!isLogin ? "hero" : "outline"} onClick={() => setIsLogin(false)}>
              Đăng ký
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="mb-2 block text-sm font-bold">Tên</label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập tên của bạn"
                  required={!isLogin}
                  className="neo-border"
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-bold">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
                className="neo-border"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold">Mật khẩu</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="neo-border"
              />
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading ? "Đang xử lý..." : isLogin ? "Đăng nhập" : "Đăng ký"}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm font-bold text-primary hover:underline"
            >
              {isLogin ? "Chưa có tài khoản? Đăng ký ngay" : "Đã có tài khoản? Đăng nhập"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
