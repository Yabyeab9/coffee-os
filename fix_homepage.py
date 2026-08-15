with open('/workspace/app-cvq4redfdog1/src/pages/site/HomePage.tsx', 'r') as f:
    c = f.read()
    
old_block = """const [personalization, setPersonalization] = useState<any>(null);

  useEffect(() => {
    async function loadPersonalization() {
      if (!session?.user) return;
      // Mock an AI prediction or fetch from real table
      const { data: prediction } = await supabase
        .from('predictions')
        .select('*')
        .eq('prediction_type', 'demand_forecast')
        .maybeSingle();
      
      const { data: tasteProfile } = await supabase
        .from('customer_taste_profiles')
        .select('*')
        .eq('customer_id', session.user.id)
        .maybeSingle();
        
      setPersonalization({
        tasteProfile,
        suggestion: "Iced Oat Latte" // We can fetch from menu based on taste
      });
    }
    loadPersonalization();
  }, [session?.user]);"""

new_block = """const [personalization, setPersonalization] = useState<any>(null);

  useEffect(() => {
    async function loadPersonalization() {
      if (!session?.user) return;
      
      const { data: recs } = await supabase
        .from('customer_ai_recommendations')
        .select('*')
        .eq('customer_id', session.user.id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (recs && recs.recommended_items && recs.recommended_items.length > 0) {
        setPersonalization({
          suggestion: recs.recommended_items[0].name
        });
      }
    }
    loadPersonalization();
  }, [session?.user]);"""

import re

# We will just replace it loosely
c = re.sub(r'const \[personalization.*?(?=useEffect \(\(\) => \{)', new_block + '\n\n  ', c, flags=re.DOTALL)

with open('/workspace/app-cvq4redfdog1/src/pages/site/HomePage.tsx', 'w') as f:
    f.write(c)
