-- Create user progress table
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  stage_id INTEGER NOT NULL,
  scene_id INTEGER,
  completed BOOLEAN DEFAULT false,
  stars INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create boss challenges table
CREATE TABLE IF NOT EXISTS public.boss_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  stage_id INTEGER NOT NULL,
  scenario TEXT NOT NULL,
  gender TEXT NOT NULL,
  personality TEXT NOT NULL,
  conversation_history JSONB DEFAULT '[]'::jsonb,
  score INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  passed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boss_challenges ENABLE ROW LEVEL SECURITY;

-- Create policies for user_progress
CREATE POLICY "Users can view their own progress"
ON public.user_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress"
ON public.user_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.user_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- Create policies for boss_challenges
CREATE POLICY "Users can view their own boss challenges"
ON public.boss_challenges
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own boss challenges"
ON public.boss_challenges
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own boss challenges"
ON public.boss_challenges
FOR UPDATE
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_user_progress_updated_at
BEFORE UPDATE ON public.user_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boss_challenges_updated_at
BEFORE UPDATE ON public.boss_challenges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();