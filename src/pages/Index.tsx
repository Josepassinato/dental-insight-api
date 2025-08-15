import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import Dashboard from './Dashboard';
import { Loader2, Stethoscope } from 'lucide-react';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (!session) {
        navigate('/auth');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_OUT' || !session) {
          navigate('/auth');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-medical-light/10 to-accent/20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-info rounded-2xl flex items-center justify-center shadow-medium animate-pulse">
            <Stethoscope className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="flex items-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando sistema...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return <Dashboard user={user} />;
};

export default Index;
