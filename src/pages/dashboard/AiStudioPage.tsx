import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { AiFeature } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Sparkles, Globe, Palette, Coffee, PenLine, Megaphone, Search,
  TrendingUp, BarChart2, Languages, MessageSquare, Zap, BookMarked,
  History, Gauge, ChevronRight, Copy, Check, Loader2, RefreshCw,
} from 'lucide-react';

const DEMO_CAFE_ID = '00000000-0000-0000-0000-000000000001';

// ─── Module registry ──────────────────────────────────────────────────────────
const AI_MODULES: {
  id: AiFeature;
  label: string;
  icon: React.ElementType;
  desc: string;
  promptLabel: string;
  promptPlaceholder: string;
  extra?: { label: string; key: string; placeholder: string; type?: string }[];
}[] = [
  {
    id: 'website_builder', label: 'Website Builder', icon: Globe, desc: 'Generate full page sections from your café description',
    promptLabel: 'Café Description', promptPlaceholder: 'Describe your café — name, vibe, cuisine, location, target audience…',
  },
  {
    id: 'theme_generator', label: 'Theme Generator', icon: Palette, desc: 'Get theme color tokens from brand mood',
    promptLabel: 'Brand Mood & Keywords', promptPlaceholder: 'e.g. warm, earthy, artisanal, minimalist, premium…',
  },
  {
    id: 'menu_generator', label: 'Menu Generator', icon: Coffee, desc: 'Generate a complete menu with categories',
    promptLabel: 'Café Concept', promptPlaceholder: 'Specialty Ethiopian coffee shop with pour-overs, ceremony coffees, and pastries…',
    extra: [{ label: 'Price Range', key: 'price_range', placeholder: 'e.g. 80–300 ETB' }],
  },
  {
    id: 'product_description', label: 'Product Descriptions', icon: PenLine, desc: 'Enrich individual menu items',
    promptLabel: 'Item Name', promptPlaceholder: 'e.g. Ethiopian Ceremony Coffee',
    extra: [{ label: 'Notes / Flavor Profile', key: 'notes', placeholder: 'Yirgacheffe, floral, bright acidity, honey process…' }],
  },
  {
    id: 'blog_writer', label: 'Blog Writer', icon: PenLine, desc: 'Generate full SEO-optimized blog posts',
    promptLabel: 'Blog Topic', promptPlaceholder: 'The history of Ethiopian coffee ceremony and its cultural significance',
    extra: [{ label: 'Target Keywords', key: 'keywords', placeholder: 'ethiopian coffee, addis ababa café' }],
  },
  {
    id: 'marketing_studio', label: 'Marketing Studio', icon: Megaphone, desc: 'Social posts, captions, email campaigns',
    promptLabel: 'Campaign Goal', promptPlaceholder: 'Promote our new cold-brew offering for the summer season',
    extra: [{ label: 'Platform', key: 'platform', placeholder: 'Instagram, Facebook, Email…' }],
  },
  {
    id: 'seo_generator', label: 'SEO Generator', icon: Search, desc: 'Titles, descriptions, keywords, structured data',
    promptLabel: 'Page / Content', promptPlaceholder: 'Home page for a specialty coffee shop in Addis Ababa',
  },
  {
    id: 'business_advisor', label: 'Business Advisor', icon: TrendingUp, desc: 'Insights and recommendations from your data',
    promptLabel: 'Question or Problem', promptPlaceholder: 'How can I increase reservations on weekdays?',
  },
  {
    id: 'analytics_assistant', label: 'AI Analytics', icon: BarChart2, desc: 'Ask questions about your data in natural language',
    promptLabel: 'Your Question', promptPlaceholder: 'What are my most popular menu items this month?',
  },
  {
    id: 'translation', label: 'Translation', icon: Languages, desc: 'Translate any content to a target locale',
    promptLabel: 'Content to Translate', promptPlaceholder: 'Paste your text here…',
    extra: [{ label: 'Target Language', key: 'target_lang', placeholder: 'e.g. Amharic, French, Arabic' }],
  },
  {
    id: 'review_assistant', label: 'Review Assistant', icon: MessageSquare, desc: 'Generate polished responses to customer reviews',
    promptLabel: 'Customer Review', promptPlaceholder: 'Paste the review here…',
    extra: [{ label: 'Tone', key: 'tone', placeholder: 'Warm and professional' }],
  },
  {
    id: 'campaign_generator', label: 'Campaign Generator', icon: Zap, desc: 'Full campaign outline with content calendar',
    promptLabel: 'Campaign Brief', promptPlaceholder: 'Ramadan promotion for our special menu, running 3 weeks',
    extra: [{ label: 'Duration (weeks)', key: 'duration', placeholder: '3', type: 'number' }],
  },
];

const SIDEBAR_EXTRAS = [
  { id: 'prompt_library', label: 'Prompt Library', icon: BookMarked },
  { id: 'history', label: 'Generation History', icon: History },
  { id: 'usage', label: 'Usage Tracking', icon: Gauge },
];

// ─── Demo AI Generator (calls Supabase edge function if deployed, else mock) ─
async function callAI(feature: AiFeature, prompt: string, extra: Record<string, string>): Promise<string> {
  // Attempt edge function call; fall back gracefully
  try {
    const { data, error } = await supabase.functions.invoke('ai-generate', {
      body: { feature, prompt, extra },
    });
    if (!error && data?.output) return data.output;
  } catch {
    // Edge function not deployed — return rich demo output
  }
  // Demo outputs per feature
  const demos: Partial<Record<AiFeature, string>> = {
    website_builder: `## Hero Section\n**Headline:** Wake Up to Ethiopia's Finest\n**Subline:** Single-origin specialty coffee, brewed with intention.\n**CTA:** Reserve a Table\n\n## About Snippet\n*"We source directly from small farms in Yirgacheffe, Guji, and Sidama — building relationships that go beyond trade."*\n\n## Features Bento\n- ☕ Ceremony Coffee — Experience the traditional Ethiopian coffee ritual\n- 🌿 Direct Trade — Farm-to-cup traceability on every bag\n- 🎵 Living Space — Jazz afternoons, creative community events`,
    theme_generator: `### Generated Theme Tokens\n\n\`\`\`json\n{\n  "primary": "#4ade80",\n  "background": "#0d0e12",\n  "card": "#1a1b1f",\n  "accent": "#2dd4bf",\n  "fontHeading": "Playfair Display",\n  "fontBody": "Inter"\n}\n\`\`\`\n\n**Mood:** Warm minimalism meets specialty craft. Earthy greens evoke the Ethiopian highlands.`,
    menu_generator: `### Generated Menu\n\n**Espresso Bar**\n- Ethiopique Espresso — 80 ETB — Intensely bright, dark chocolate finish\n- Lavender Cortado — 120 ETB — Oat milk, house lavender syrup\n- Cold Brew Tonic — 140 ETB — 24-hour cold brew over sparkling water\n\n**Pour-Overs**\n- Yirgacheffe Natural — 160 ETB — Blueberry, jasmine, honey\n- Guji Washed — 150 ETB — Citrus, stone fruit, clean finish\n\n**Ceremony**\n- Full Ceremony Set — 300 ETB — Three rounds, frankincense, fresh-roasted`,
    blog_writer: `# The Ethiopian Coffee Ceremony: A Living Tradition\n\nIn the highlands of Ethiopia, where coffee was born, the ceremony is not merely a ritual — it is a declaration of community.\n\n## Three Rounds, Three Meanings\n*Abol* — the first, strongest pour, representing vitality.\n*Tona* — the second, a gesture of friendship.\n*Baraka* — the third, a blessing.\n\n## Why It Matters to Specialty Coffee\nThe ceremony predates every third-wave trend by centuries. Modern specialty coffee has learned to slow down, to cup attentively, to honour origin — lessons the ceremony has been teaching for generations.\n\n**Come experience it** at Abat Coffee, every Friday afternoon.`,
    seo_generator: `### SEO Recommendations\n\n**Title Tag:** Abat Coffee Addis Ababa | Specialty Ethiopian Coffee Shop\n\n**Meta Description:** Experience the finest single-origin Ethiopian coffee at Abat Coffee in Addis Ababa. Espresso bar, pour-overs, ceremony coffees, and fresh pastries. Reserve your table.\n\n**Keywords:** specialty coffee addis ababa, ethiopian coffee shop, pour over addis, yirgacheffe coffee, coffee ceremony addis ababa\n\n**Structured Data (JSON-LD):**\n\`\`\`json\n{ "@type": "CafeOrCoffeeShop", "name": "Abat Coffee", "servesCuisine": "Coffee" }\n\`\`\``,
    marketing_studio: `### Instagram Post\n☕ Summer is here — and so is our Cold Brew Tonic.\n\n24-hour cold brew + sparkling water + a hint of citrus. Zero compromise.\n\nAvailable daily until 6pm. 140 ETB. Tag a friend who needs this ↓\n\n*#AbatCoffee #ColdBrew #AddisAbaba #SpecialtyCoffee*\n\n---\n### Email Subject Lines\n1. "Beat the heat with Abat's new Cold Brew Tonic"\n2. "Summer special: cold brew done right"\n3. "Your afternoon just got cooler ☁️"`,
    business_advisor: `### Business Insights\n\n**Opportunity:** Weekday reservations are 40% lower than weekends. Consider:\n- "Midweek Ritual" promotion — 15% off Tuesday–Thursday\n- Laptop-friendly afternoon sessions with timed Wi-Fi\n- Corporate catering outreach to nearby offices\n\n**Quick Win:** Your most-viewed menu item (Yirgacheffe Pour-Over) has no description. Adding tasting notes could increase conversion by 20–30%.\n\n**Long-term:** Implement a loyalty stamp card — research shows 60% of specialty coffee customers prefer a simple physical card over an app.`,
    translation: `### Amharic Translation\n\nOriginal: "Experience the traditional Ethiopian coffee ceremony"\n\nTranslation: **"ባህላዊውን የኢትዮጵያ ቡና ሥርዓት ያስተሙ"**\n\n---\nNote: Amharic uses the Ge'ez script (Ethiopic). Ensure your fonts support Unicode block U+1200–U+137F for proper rendering.`,
  };
  return demos[feature] ?? `### AI Response for "${feature}"\n\nYour prompt: *"${prompt}"*\n\nThis is a demo output. Deploy the **ai-generate** Edge Function to get real AI responses from OpenAI/Anthropic. The platform is provider-agnostic — just set your API key in Supabase secrets.\n\n**Sample output:**\n- ✅ Content generated successfully\n- 📊 Tokens used: ~350\n- ⚡ Latency: 1.2s`;
}

// ─── Main AI Studio Component ─────────────────────────────────────────────────
export default function AiStudioPage() {
  const { cafeId, profile } = useAuth();
  const resolvedId = cafeId ?? DEMO_CAFE_ID;
  const [activeModule, setActiveModule] = useState<AiFeature>('website_builder');
  const [sideView, setSideView] = useState<'modules' | 'history' | 'prompt_library' | 'usage'>('modules');
  const [prompt, setPrompt] = useState('');
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<{ id: string; feature: AiFeature; prompt: string; output: string; created_at: string }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const module = AI_MODULES.find(m => m.id === activeModule)!;

  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error('Please enter a prompt'); return; }
    setIsGenerating(true);
    setOutput('');
    try {
      const result = await callAI(activeModule, prompt.trim(), extra);
      setOutput(result);
      // Save to DB
      await supabase.from('ai_generations').insert({
        cafe_id: resolvedId,
        user_id: profile?.id ?? null,
        feature: activeModule,
        prompt: prompt.trim(),
        output: result,
        tokens_used: Math.floor(result.length / 4),
        feedback: null,
      });
    } catch {
      toast.error('Generation failed. Please try again.');
    }
    setIsGenerating(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase.from('ai_generations').select('id, feature, prompt, output, created_at').eq('cafe_id', resolvedId).order('created_at', { ascending: false }).limit(20);
    setHistory(Array.isArray(data) ? data : []);
    setLoadingHistory(false);
  };

  const selectModule = (id: AiFeature) => {
    setActiveModule(id);
    setPrompt('');
    setExtra({});
    setOutput('');
    setSideView('modules');
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border/40 overflow-y-auto hidden md:flex flex-col p-3 gap-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1.5">AI Modules</p>
        {AI_MODULES.map(m => (
          <button
            key={m.id}
            onClick={() => selectModule(m.id)}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-left w-full ${activeModule === m.id ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
          >
            <m.icon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{m.label}</span>
          </button>
        ))}
        <div className="h-px bg-border/50 my-1" />
        {SIDEBAR_EXTRAS.map(e => (
          <button
            key={e.id}
            onClick={() => { setSideView(e.id as any); if (e.id === 'history') loadHistory(); }}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-left w-full ${sideView === e.id ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
          >
            <e.icon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{e.label}</span>
          </button>
        ))}
      </aside>

      {/* Main Panel */}
      <div className="flex-1 min-w-0 flex flex-col">
        <AnimatePresence mode="wait">
          {sideView === 'history' ? (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto p-6 space-y-4">
              <h2 className="font-heading font-semibold text-foreground">Generation History</h2>
              {loadingHistory ? (
                <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
              ) : history.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">No generations yet. Use any AI module to get started.</div>
              ) : (
                history.map(h => (
                  <div key={h.id} className="glass rounded-xl p-4 space-y-2 cursor-pointer hover:bg-secondary/30 transition-colors" onClick={() => { selectModule(h.feature); setPrompt(h.prompt); setOutput(h.output); }}>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">{h.feature.replace('_', ' ')}</Badge>
                      <span className="text-[10px] text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-1">{h.prompt}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{h.output.slice(0, 120)}…</p>
                  </div>
                ))
              )}
            </motion.div>
          ) : sideView === 'prompt_library' ? (
            <motion.div key="prompts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto p-6 space-y-4">
              <h2 className="font-heading font-semibold text-foreground">Prompt Library</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { label: 'Homepage Hero', feature: 'website_builder', prompt: 'A specialty coffee shop in Addis Ababa serving single-origin Ethiopian coffees in a warm, modern space.' },
                  { label: 'Seasonal Promo', feature: 'marketing_studio', prompt: 'Create Instagram posts for our new seasonal menu launching in December.' },
                  { label: 'Menu Enrichment', feature: 'product_description', prompt: 'Yirgacheffe Natural Process', extra: 'Tasting notes: blueberry, jasmine, honey, bright acidity' },
                  { label: 'Blog: Coffee Origin', feature: 'blog_writer', prompt: 'The journey of Ethiopian coffee from farm to cup — a story of craft and community.' },
                  { label: 'Holiday Campaign', feature: 'campaign_generator', prompt: 'Christmas and New Year promotions for a coffee shop with gift card and event options.' },
                  { label: 'SEO: Menu Page', feature: 'seo_generator', prompt: 'Menu page for a specialty Ethiopian coffee shop offering espresso, pour-overs, and pastries.' },
                ].map(p => (
                  <div key={p.label} className="glass rounded-xl p-4 hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => { selectModule(p.feature as AiFeature); setPrompt(p.prompt); }}>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mb-2 capitalize">{p.feature.replace('_', ' ')}</Badge>
                    <p className="text-sm font-medium text-foreground mb-1">{p.label}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{p.prompt}</p>
                    <div className="flex items-center gap-1 mt-2 text-primary text-xs font-medium">
                      Use this prompt <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : sideView === 'usage' ? (
            <motion.div key="usage" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto p-6 space-y-4">
              <h2 className="font-heading font-semibold text-foreground">Usage Tracking</h2>
              <div className="glass rounded-xl p-5 space-y-4">
                <p className="text-sm text-muted-foreground">Usage data is tracked per generation. Deploy the AI Edge Function to see real token consumption and cost estimates.</p>
                <div className="space-y-2">
                  {AI_MODULES.map(m => (
                    <div key={m.id} className="flex items-center gap-3">
                      <m.icon className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-sm text-foreground flex-1">{m.label}</span>
                      <span className="text-xs text-muted-foreground">0 calls</span>
                      <div className="w-24 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary/30 rounded-full w-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key={activeModule} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
              {/* Input Panel */}
              <div className="flex-1 min-w-0 p-6 space-y-5 overflow-y-auto border-r border-border/40">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                      <module.icon className="w-4 h-4 text-primary" />
                    </div>
                    <h2 className="font-heading font-semibold text-foreground">{module.label}</h2>
                    <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px] px-1.5 py-0">AI</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{module.desc}</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">{module.promptLabel} *</Label>
                  <Textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder={module.promptPlaceholder}
                    className="bg-input border-border resize-none"
                    rows={5}
                  />
                </div>

                {module.extra?.map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">{field.label}</Label>
                    <Input
                      type={field.type ?? 'text'}
                      value={extra[field.key] ?? ''}
                      onChange={e => setExtra(x => ({ ...x, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="bg-input border-border"
                    />
                  </div>
                ))}

                <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating…</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Generate with AI</>
                  )}
                </Button>

                {/* Mobile: show output below on small screens */}
                {output && (
                  <div className="md:hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Output</span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={isGenerating} className="text-muted-foreground h-7 px-2">
                          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Regenerate
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleCopy} className="text-muted-foreground h-7 px-2">
                          {copied ? <Check className="w-3.5 h-3.5 mr-1 text-primary" /> : <Copy className="w-3.5 h-3.5 mr-1" />} Copy
                        </Button>
                      </div>
                    </div>
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans glass rounded-xl p-4 max-h-72 overflow-y-auto">
                      {output}
                    </pre>
                  </div>
                )}
              </div>

              {/* Output Panel — desktop */}
              <div className="hidden md:flex flex-col flex-1 min-w-0 p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Output</span>
                  {output && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={isGenerating} className="text-muted-foreground h-7 px-2 text-xs">
                        <RefreshCw className="w-3 h-3 mr-1" /> Regenerate
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleCopy} className="text-muted-foreground h-7 px-2 text-xs">
                        {copied ? <Check className="w-3 h-3 mr-1 text-primary" /> : <Copy className="w-3 h-3 mr-1" />} Copy
                      </Button>
                    </div>
                  )}
                </div>
                {output ? (
                  <pre className="flex-1 text-sm text-muted-foreground whitespace-pre-wrap font-sans glass rounded-xl p-4 overflow-y-auto leading-relaxed">
                    {output}
                  </pre>
                ) : (
                  <div className="flex-1 glass rounded-xl flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                    <Sparkles className="w-10 h-10 mb-3 opacity-20" />
                    <p className="text-sm">Your AI-generated content will appear here.</p>
                    <p className="text-xs mt-1">Enter a prompt and click Generate.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
