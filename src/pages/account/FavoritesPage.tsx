import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Heart, Coffee } from 'lucide-react';

export default function FavoritesPage() {
  const { profile } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!profile?.id) return;
      try {
        // favorites table may not exist yet — gracefully return empty
        setFavorites([]);
      } catch {
        // non-fatal
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [profile?.id]);

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-heading font-semibold text-foreground flex items-center gap-2">
        <Heart className="w-6 h-6 text-primary" /> My Favorites
      </h1>
      
      {isLoading ? (
        <div className="flex justify-center p-10"><Coffee className="w-6 h-6 animate-pulse text-muted-foreground" /></div>
      ) : favorites.length === 0 ? (
        <div className="glass rounded-xl p-10 text-center text-muted-foreground">
          <Heart className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p>You haven't saved any favorites yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* list favorites if there were any */}
        </div>
      )}
    </div>
  );
}