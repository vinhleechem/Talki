import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Send, Trophy } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface BossChallengeProps {
  scenario: string;
  scenarioName: string;
  gender: "male" | "female";
  personality: string;
  personalityName: string;
  stageId: number;
}

const BossChallenge = ({ scenario, scenarioName, gender, personality, personalityName, stageId }: BossChallengeProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationCount, setConversationCount] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string>("");

  const maxExchanges = 7;
  const progress = (conversationCount / maxExchanges) * 100;

  useEffect(() => {
    // Start with AI's opening message
    sendInitialMessage();
  }, []);

  const sendInitialMessage = async () => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke('boss-chat', {
        body: {
          messages: [{ role: 'user', content: 'Start the scenario. Introduce yourself and create an opening situation.' }],
          scenario: scenarioName,
          personality: personalityName,
          gender: gender
        }
      });

      if (response.error) throw response.error;

      const aiMessage = response.data.message;
      setMessages([{ role: 'assistant', content: aiMessage }]);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to start the challenge. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user' as const, content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setConversationCount(prev => prev + 1);

    try {
      const shouldEvaluate = conversationCount >= maxExchanges - 1;
      
      const messageToSend = shouldEvaluate 
        ? [...newMessages, { role: 'user' as const, content: 'Please provide your EVALUATION now with a score (0-100) and feedback.' }]
        : newMessages;

      const response = await supabase.functions.invoke('boss-chat', {
        body: {
          messages: messageToSend,
          scenario: scenarioName,
          personality: personalityName,
          gender: gender
        }
      });

      if (response.error) throw response.error;

      const aiMessage = response.data.message;
      
      // Check if this is an evaluation
      if (aiMessage.includes('EVALUATION:')) {
        setIsEvaluating(true);
        const evaluationMatch = aiMessage.match(/EVALUATION:\s*(\d+)/);
        if (evaluationMatch) {
          const score = parseInt(evaluationMatch[1]);
          setFinalScore(score);
          
          // Extract feedback
          const feedbackText = aiMessage.split('EVALUATION:')[1].replace(/\d+/g, '').trim();
          setFeedback(feedbackText);

          // Save to database
          await saveBossChallenge(score, newMessages, aiMessage);
        }
      }

      setMessages([...newMessages, { role: 'assistant', content: aiMessage }]);

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveBossChallenge = async (score: number, conversation: Message[], finalMessage: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const passed = score >= 60;

      await supabase.from('boss_challenges').insert({
        user_id: user.id,
        stage_id: stageId,
        scenario: scenarioName,
        gender: gender,
        personality: personalityName,
        conversation_history: [...conversation, { role: 'assistant', content: finalMessage }],
        score: score,
        completed: true,
        passed: passed
      });

      if (passed) {
        toast({
          title: "Boss Defeated! 🎉",
          description: `You scored ${score}! Next stage unlocked.`,
        });
      } else {
        toast({
          title: "Try Again",
          description: `You scored ${score}. Practice more to unlock the next stage.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving challenge:', error);
    }
  };

  if (isEvaluating && finalScore !== null) {
    return (
      <div className="min-h-screen pb-20 flex items-center justify-center">
        <Card className="p-8 max-w-lg neo-border neo-shadow">
          <div className="text-center space-y-6">
            <Trophy className={`w-24 h-24 mx-auto ${finalScore >= 60 ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <h2 className="text-3xl font-black mb-2">
                {finalScore >= 60 ? 'Boss Defeated! 🎉' : 'Try Again 💪'}
              </h2>
              <div className="text-6xl font-black my-4">{finalScore}/100</div>
              <p className="text-lg font-medium text-muted-foreground">{feedback}</p>
            </div>
            <Button 
              variant="hero" 
              size="lg" 
              onClick={() => navigate('/roadmap')}
              className="w-full"
            >
              Back to Road Map
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="container mx-auto px-4 pt-24 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => navigate('/boss')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-foreground">Boss Challenge</h1>
            <p className="text-sm font-medium text-muted-foreground">
              {scenarioName} • {personalityName}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-bold">Progress</span>
            <span className="text-sm font-bold">{conversationCount}/{maxExchanges}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Chat Messages */}
        <div className="space-y-4 mb-24">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <Card className={`p-4 max-w-[80%] neo-border ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-card'
              }`}>
                <p className="font-medium">{msg.content}</p>
              </Card>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <Card className="p-4 neo-border bg-card">
                <p className="font-medium text-muted-foreground">Typing...</p>
              </Card>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t neo-border p-4">
          <div className="container mx-auto max-w-4xl flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your response..."
              disabled={loading || conversationCount >= maxExchanges}
              className="flex-1"
            />
            <Button 
              onClick={handleSend} 
              disabled={loading || !input.trim() || conversationCount >= maxExchanges}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BossChallenge;