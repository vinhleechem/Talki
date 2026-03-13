import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy, Mic, MicOff, Volume2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { VoiceRecorder, VoiceSynthesis, VoiceRecognition } from "@/utils/voiceRecorder";
import Navbar from "@/components/Navbar";

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
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const voiceRecorderRef = useRef<VoiceRecorder | null>(null);
  const voiceSynthesisRef = useRef<VoiceSynthesis | null>(null);
  const voiceRecognitionRef = useRef<VoiceRecognition | null>(null);

  const maxExchanges = 7;
  const progress = (conversationCount / maxExchanges) * 100;

  useEffect(() => {
    voiceSynthesisRef.current = new VoiceSynthesis();
    try {
      voiceRecognitionRef.current = new VoiceRecognition();
    } catch (error) {
      console.log('Voice recognition not supported in this browser');
    }
    
    // Start with AI's opening message
    sendInitialMessage();

    return () => {
      if (voiceSynthesisRef.current) {
        voiceSynthesisRef.current.stop();
      }
      if (voiceRecorderRef.current?.isRecording()) {
        voiceRecorderRef.current.stop();
      }
    };
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
      
      // Auto-speak the opening message
      if (voiceSynthesisRef.current) {
        setIsSpeaking(true);
        try {
          await voiceSynthesisRef.current.speak(aiMessage, { lang: 'vi-VN' });
        } catch (error) {
          console.error('Error speaking:', error);
        } finally {
          setIsSpeaking(false);
        }
      }
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

      // Auto-speak AI response
      if (voiceSynthesisRef.current && !isEvaluating) {
        setIsSpeaking(true);
        try {
          await voiceSynthesisRef.current.speak(aiMessage, { lang: 'vi-VN' });
        } catch (error) {
          console.error('Error speaking:', error);
        } finally {
          setIsSpeaking(false);
        }
      }

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

  const handleStartRecording = async () => {
    if (!voiceRecognitionRef.current) {
      toast({
        title: "Voice not supported",
        description: "Your browser doesn't support voice recognition",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRecording(true);
      voiceRecognitionRef.current.startListening(
        (transcript) => {
          setInput(transcript);
          setIsRecording(false);
        },
        (error) => {
          console.error('Voice recognition error:', error);
          toast({
            title: "Voice error",
            description: "Failed to recognize speech. Please try again.",
            variant: "destructive",
          });
          setIsRecording(false);
        }
      );
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (voiceRecognitionRef.current) {
      voiceRecognitionRef.current.stopListening();
      setIsRecording(false);
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
      <div className="min-h-screen pb-20 bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-24 px-4">
          <Card className="p-8 max-w-lg neo-border neo-shadow">
            <div className="text-center space-y-6">
              <Trophy className={`w-24 h-24 mx-auto ${finalScore >= 60 ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <h2 className="text-3xl font-black mb-2">
                  {finalScore >= 60 ? "Boss Defeated! 🎉" : "Try Again 💪"}
                </h2>
                <div className="text-6xl font-black my-4">{finalScore}/100</div>
                <p className="text-lg font-medium text-muted-foreground">{feedback}</p>
              </div>
              <Button
                variant="hero"
                size="lg"
                onClick={() => navigate("/roadmap")}
                className="w-full"
              >
                Back to Road Map
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => navigate('/roadmap')}>
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

        {/* Voice Controls */}
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant={isRecording ? "destructive" : "secondary"}
            size="lg"
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            disabled={isSpeaking || loading}
            className="flex items-center gap-2"
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            {isRecording ? "Dừng ghi âm" : "Bắt đầu nói"}
          </Button>

          {isSpeaking && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Volume2 className="w-4 h-4 animate-pulse" />
              <span>Boss đang nói...</span>
            </div>
          )}

          {isRecording && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <Mic className="w-4 h-4 animate-pulse" />
              <span>Đang ghi âm...</span>
            </div>
          )}
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

      </div>
    </div>
  );
};

export default BossChallenge;