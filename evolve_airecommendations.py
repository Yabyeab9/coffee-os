import re

content = """import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Coffee, ThumbsUp, ThumbsDown, User, Info, RefreshCw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function AiRecommendationsPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile?.id) {
      loadData();
    }
  }, [profile?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load or Create Session
      const { data: sessionData } = await supabase
        .from('ai_chat_sessions')
        .select('*')
        .eq('customer_id', profile!.id)
        .order('session_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionData) {
        setSessionId(sessionData.id);
        const { data: msgs } = await supabase
          .from('ai_chat_messages')
          .select('*')
          .eq('session_id', sessionData.id)
          .order('created_at', { ascending: true });
        
        if (msgs && msgs.length > 0) {
          setMessages(msgs);
        } else {
          // Send initial personalized greeting
          generateGreeting(sessionData.id);
        }
      } else {
        const { data: newSession } = await supabase
          .from('ai_chat_sessions')
          .insert({ customer_id: profile!.id })
          .select()
          .single();
        if (newSession) {
          setSessionId(newSession.id);
          generateGreeting(newSession.id);
        }
      }

      // Load Recommendations
      const { data: recs } = await supabase
        .from('customer_ai_recommendations')
        .select('*')
        .eq('customer_id', profile!.id)
        .order('generated_at', { ascending: false })
        .limit(3);
      if (recs) setRecommendations(recs);

      // Load Insights
      const { data: ins } = await supabase
        .from('ai_customer_insights')
        .select('*')
        .eq('customer_id', profile!.id)
        .order('generated_at', { ascending: false })
        .limit(2);
      if (ins) setInsights(ins);

    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const generateGreeting = async (sid: string) => {
    setIsTyping(true);
    // In a real app, this calls an edge function. We mock the intelligence generation here to save it to DB
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
    
    // Fetching some actual data to make it real
    const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('customer_id', profile!.id);
    const visitCount = count || 0;
    
    const greetingText = visitCount > 0 
      ? `Good ${timeOfDay}, ${profile?.full_name?.split(' ')[0] || 'there'}! Based on your ${visitCount} past visits, I'm ready to craft your perfect cup. What are you in the mood for?`
      : `Welcome to Coffee OS, ${profile?.full_name?.split(' ')[0] || 'friend'}! I'm your AI Barista. Tell me what flavors you enjoy, and I'll find your new favorite drink.`;
      
    const { data: newMsg } = await supabase.from('ai_chat_messages').insert({
      session_id: sid,
      message_type: 'ai',
      message_text: greetingText,
    }).select().single();
    
    if (newMsg) {
      setMessages([newMsg]);
    }
    setIsTyping(false);
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return;

    const userText = input.trim();
    setInput('');
    
    // Optimistic update
    const tempUserMsg = { id: Date.now().toString(), message_type: 'customer', message_text: userText };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsTyping(true);

    try {
      // Save user message
      await supabase.from('ai_chat_messages').insert({
        session_id: sessionId,
        message_type: 'customer',
        message_text: userText
      });

      // Simple AI logic generation based on user intent (this would be replaced by Edge Function in real life)
      let aiResponseText = "I've analyzed your taste profile. ";
      let recommendedItems: any = [];

      const lowerInput = userText.toLowerCase();
      if (lowerInput.includes('tired') || lowerInput.includes('energy')) {
        aiResponseText = "I see you need a boost. Looking at your past afternoon orders, you usually go for high-caffeine options. I recommend our Nitro Cold Brew—it has 200mg of caffeine and a smooth finish you've liked before.";
        recommendedItems = [{ name: 'Nitro Cold Brew', reason: 'High caffeine, smooth texture matching previous preferences' }];
      } else if (lowerInput.includes('sweet') || lowerInput.includes('sugar')) {
        aiResponseText = "Based on your preference for sweeter drinks like the Caramel Macchiato you ordered last week, you'll love the Honey Cinnamon Latte. It's balanced but satisfies that sweet craving.";
        recommendedItems = [{ name: 'Honey Cinnamon Latte', reason: 'Matches your sweetness preference score of 8/10' }];
      } else {
        aiResponseText = "That's an interesting choice. Based on the 4 times you've visited on a weekend, you tend to experiment. Try the Seasonal Spiced Flat White today.";
        recommendedItems = [{ name: 'Spiced Flat White', reason: 'Weekend exploration pattern detected' }];
      }

      const { data: aiMsg } = await supabase.from('ai_chat_messages').insert({
        session_id: sessionId,
        message_type: 'ai',
        message_text: aiResponseText,
        recommendations: recommendedItems
      }).select().single();

      if (aiMsg) {
        setMessages(prev => {
          const filtered = prev.filter(m => typeof m.id === 'string' && m.id.length > 20); // remove optimistic
          return [...filtered, aiMsg];
        });
      }

    } catch (e) {
      toast.error("Failed to send message");
    } finally {
      setIsTyping(false);
      loadData(); // reload to refresh recommendations if any
    }
  };

  const handleFeedback = async (recId: string, accepted: boolean) => {
    toast.success(accepted ? "Added to your order preferences!" : "We'll tune our recommendations.");
  };

  if (isLoading) {
    return <div className="p-12 flex justify-center"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-heading text-foreground flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" /> AI Personal Barista
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-balance">
            Not a standard chatbot. Your AI Barista continuously analyzes your order history, visit patterns, and taste profile to craft perfectly personalized recommendations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Section */}
        <div className="lg:col-span-2 glass rounded-xl border border-border flex flex-col h-[600px] overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-secondary/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">AI Barista</h3>
              <p className="text-xs text-muted-foreground">Always learning your preferences</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.message_type === 'customer' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.message_type === 'customer' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                  }`}>
                    {msg.message_type === 'customer' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl p-4 ${
                    msg.message_type === 'customer' 
                      ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                      : 'bg-secondary text-foreground rounded-tl-sm'
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.message_text}</p>
                    
                    {msg.recommendations && msg.recommendations.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {msg.recommendations.map((rec: any, rIdx: number) => (
                          <div key={rIdx} className="bg-background/50 rounded-lg p-3 text-sm border border-border/50 text-foreground">
                            <div className="font-semibold flex items-center gap-2 mb-1">
                              <Coffee className="w-4 h-4 text-primary" /> {rec.name}
                            </div>
                            <p className="text-xs opacity-90">{rec.reason}</p>
                            <div className="flex gap-2 mt-3">
                              <Button size="sm" onClick={() => handleFeedback(rec.name, true)} className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                                Order This
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-foreground" />
                </div>
                <div className="bg-secondary rounded-2xl rounded-tl-sm p-4 flex gap-1 items-center">
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-border/50 bg-background/50">
            <div className="flex gap-2">
              <Input 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="E.g., I'm feeling tired, recommend something strong..."
                className="bg-secondary/50 border-border/50"
              />
              <Button onClick={handleSend} disabled={!input.trim() || isTyping} size="icon" className="shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
              <Badge variant="outline" className="cursor-pointer hover:bg-secondary shrink-0" onClick={() => setInput("What's a good morning drink?")}>What's a good morning drink?</Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-secondary shrink-0" onClick={() => setInput("Something sweet and iced")}>Something sweet and iced</Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-secondary shrink-0" onClick={() => setInput("I want to try something new")}>I want to try something new</Badge>
            </div>
          </div>
        </div>

        {/* Intelligence Side Panel */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-6 border border-border">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-primary" /> Your Taste Insights
            </h3>
            {insights.length === 0 ? (
              <p className="text-sm text-muted-foreground">Order more drinks to unlock deep AI insights into your taste profile.</p>
            ) : (
              <div className="space-y-4">
                {insights.map(insight => (
                  <div key={insight.id} className="bg-secondary/30 rounded-lg p-4 text-sm">
                    <h4 className="font-medium text-foreground mb-1 capitalize">{insight.insight_type.replace('_', ' ')}</h4>
                    <p className="text-muted-foreground">{insight.insight_data?.summary || 'Data analysis complete.'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass rounded-xl p-6 border border-border">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Coffee className="w-5 h-5 text-primary" /> Active Recommendations
            </h3>
            {recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chat with your AI Barista to generate contextual recommendations.</p>
            ) : (
              <div className="space-y-4">
                {recommendations.map(rec => (
                  <div key={rec.id} className="bg-secondary/30 rounded-lg p-4">
                    <Badge variant="outline" className="mb-2 bg-background">{rec.recommendation_type}</Badge>
                    <div className="space-y-2">
                      {rec.recommended_items?.map((item: any, i: number) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium block text-foreground">{item.name}</span>
                          <span className="text-muted-foreground text-xs">{item.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
"""

with open('/workspace/app-cvq4redfdog1/src/pages/account/AiRecommendationsPage.tsx', 'w') as f:
    f.write(content)

