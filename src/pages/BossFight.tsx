import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mic, User2, Smile, Meh, Frown, Laugh, Heart } from "lucide-react";
import Navbar from "@/components/Navbar";

const BossFight = () => {
  const navigate = useNavigate();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<"male" | "female" | null>(null);
  const [selectedPersonality, setSelectedPersonality] = useState<string | null>(null);

  const scenarios = [
    { id: "curious-relatives", name: "Họ hàng tò mò", emoji: "👵", difficulty: "Dễ" },
    { id: "teasing", name: "Chọc ghẹo quá đà", emoji: "😏", difficulty: "Trung bình" },
    { id: "difficult-customer", name: "Khách hàng khó tính", emoji: "😤", difficulty: "Khó" },
    { id: "friend-debate", name: "Bạn thân tranh luận", emoji: "🤔", difficulty: "Trung bình" },
    { id: "parents-in-law", name: "Phụ huynh người yêu", emoji: "🙇", difficulty: "Khó" },
  ];

  const personalities = [
    { id: "friendly", name: "Thân thiện", emoji: "😄", icon: Smile, description: "Dễ chịu, nhẹ nhàng" },
    { id: "cold", name: "Lạnh lùng", emoji: "😐", icon: Meh, description: "Ít cảm xúc, thẳng" },
    { id: "difficult", name: "Khó chịu", emoji: "😤", icon: Frown, description: "Gắt gỏng, áp lực" },
    { id: "humorous", name: "Hài hước", emoji: "😏", icon: Laugh, description: "Đùa giỡn, trêu" },
    { id: "sincere", name: "Chân thành", emoji: "😇", icon: Heart, description: "Quan tâm, lắng nghe" },
  ];

  const canStart = selectedScenario && selectedGender && selectedPersonality;

  const handleStart = () => {
    if (!canStart) return;
    // Navigate to actual boss fight
    console.log({
      scenario: selectedScenario,
      gender: selectedGender,
      personality: selectedPersonality,
    });
  };

  return (
    <div className="min-h-screen pb-20">
      <Navbar />

      <div className="container mx-auto px-4 pt-24 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => navigate("/roadmap")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-foreground">Trùm cuối 💀</h1>
            <p className="text-lg font-bold text-muted-foreground">
              Thử thách kỹ năng giao tiếp của bạn!
            </p>
          </div>
        </div>

        {/* Scenario Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-black text-foreground mb-4">1. Chọn bối cảnh</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => setSelectedScenario(scenario.id)}
                className={`p-4 rounded-sm neo-border text-left transition-all ${
                  selectedScenario === scenario.id
                    ? "bg-primary text-primary-foreground neo-shadow-lg"
                    : "bg-card hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none neo-shadow"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{scenario.emoji}</span>
                    <h3 className="font-black">{scenario.name}</h3>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-sm ${
                      selectedScenario === scenario.id
                        ? "bg-primary-foreground text-primary"
                        : "bg-muted"
                    }`}
                  >
                    {scenario.difficulty}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Gender Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-black text-foreground mb-4">2. Chọn giới tính AI</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: "male", name: "Nam", emoji: "👨" },
              { id: "female", name: "Nữ", emoji: "👩" },
            ].map((gender) => (
              <button
                key={gender.id}
                onClick={() => setSelectedGender(gender.id as "male" | "female")}
                className={`p-6 rounded-sm neo-border transition-all ${
                  selectedGender === gender.id
                    ? "bg-secondary text-secondary-foreground neo-shadow-lg"
                    : "bg-card hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none neo-shadow"
                }`}
              >
                <span className="text-4xl block mb-2">{gender.emoji}</span>
                <h3 className="font-black text-lg">{gender.name}</h3>
              </button>
            ))}
          </div>
        </div>

        {/* Personality Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-black text-foreground mb-4">3. Chọn cá tính AI</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {personalities.map((personality) => {
              const Icon = personality.icon;
              return (
                <button
                  key={personality.id}
                  onClick={() => setSelectedPersonality(personality.id)}
                  className={`p-4 rounded-sm neo-border text-left transition-all ${
                    selectedPersonality === personality.id
                      ? "bg-accent text-accent-foreground neo-shadow-lg"
                      : "bg-card hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none neo-shadow"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="w-6 h-6" />
                    <h3 className="font-black">{personality.name}</h3>
                  </div>
                  <p className="text-sm font-medium opacity-80">{personality.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Start Button */}
        <div className="flex justify-center">
          <Button
            variant="hero"
            size="lg"
            disabled={!canStart}
            onClick={handleStart}
            className="min-w-[200px]"
          >
            <Mic className="w-5 h-5 mr-2" />
            Bắt đầu thử thách!
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BossFight;
