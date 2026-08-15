import re

with open('/workspace/app-cvq4redfdog1/src/pages/site/ReservationPage.tsx', 'r') as f:
    content = f.read()

# Add needed imports
if "Sparkles" not in content:
    content = content.replace("ShoppingBag }", "ShoppingBag, Sparkles, Moon, Zap, Heart }")

# Insert vibe state
state_code = """
  // Vibe Based Smart Reservation
  const [selectedVibe, setSelectedVibe] = useState('Social Energy');
  const vibes = [
    { id: 'Quiet Focus', icon: Moon, desc: 'Deep work & reading' },
    { id: 'Social Energy', icon: Zap, desc: 'Catch-ups & lively chats' },
    { id: 'Creative Buzz', icon: Sparkles, desc: 'Inspiring & moderate' },
    { id: 'Romantic Ambiance', icon: Heart, desc: 'Cozy & intimate' }
  ];
"""

insert_pos = content.find("const [trafficPatterns, setTrafficPatterns]")
if insert_pos != -1:
    content = content[:insert_pos] + state_code + "\n" + content[insert_pos:]

# Add vibe selector UI before the date/time selector
vibe_ui = """
                {/* VIBE SELECTOR */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> What kind of experience are you looking for?</Label>
                  <p className="text-sm text-muted-foreground">Our invisible concierge will suggest the best times and seating for your desired vibe.</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {vibes.map(v => {
                      const Icon = v.icon;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVibe(v.id)}
                          className={`text-left p-3 rounded-xl transition-all duration-300 ${
                            selectedVibe === v.id 
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                              : 'bg-background border-border hover:border-primary/50'
                          } border`}
                        >
                          <Icon className="w-4 h-4 mb-2" />
                          <div className="font-semibold text-sm">{v.id}</div>
                          <div className={`text-[10px] mt-0.5 ${selectedVibe === v.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{v.desc}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
"""

# Insert before "Select Date & Time"
target_text = "<h3 className=\"text-lg font-semibold\">Select Date & Time</h3>"
if content.find(target_text) != -1:
    content = content.replace(target_text, vibe_ui + "\n\n                <h3 className=\"text-lg font-semibold mt-8\">Select Date & Time</h3>")

# Update time slots to include Vibe Match
time_slot_code = """{traffic && traffic.traffic_level === 'Low' && (
                      <span className="text-[10px] text-green-500 font-semibold flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5" /> Quiet</span>
                    )}"""
new_time_slot_code = """{traffic && traffic.traffic_level === 'Low' && selectedVibe === 'Quiet Focus' && (
                      <span className="text-[10px] text-green-500 font-semibold flex items-center gap-0.5"><Sparkles className="w-2.5 h-2.5" /> Vibe Match</span>
                    )}
                    {traffic && traffic.traffic_level === 'High' && selectedVibe === 'Social Energy' && (
                      <span className="text-[10px] text-green-500 font-semibold flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" /> Vibe Match</span>
                    )}"""

content = content.replace(time_slot_code, new_time_slot_code)

with open('/workspace/app-cvq4redfdog1/src/pages/site/ReservationPage.tsx', 'w') as f:
    f.write(content)

print("Evolved ReservationPage")
