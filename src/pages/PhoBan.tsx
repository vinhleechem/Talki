import Navbar from "@/components/Navbar";

const PhoBan = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-4xl font-black text-foreground mb-4">🏰 Phó Bản</h1>
            <p className="text-xl text-muted-foreground">Coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhoBan;
