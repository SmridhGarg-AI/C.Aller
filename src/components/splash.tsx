'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { browserSupabase } from '@/lib/supabase/client';
import styles from './splash.module.css';

import { completedOnboarding } from '@/lib/auth/flow';

export default function Splash() {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) => new Promise<void>(resolve => timers.push(setTimeout(resolve, ms)));

    async function destination(): Promise<string> {
      const db = browserSupabase();
      if (!db) return '/login';
      // getSession waits for the client's persisted session initialization.
      const { data: session, error: sessionError } = await db.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session.session) return '/login';
      const { data: { user }, error: authError } = await db.auth.getUser();
      if (authError) {
        if (authError.status === 401 || authError.status === 403) return '/login';
        throw authError;
      }
      if (!user) return '/login';
      const { data: profile, error: profileError } = await db.from('profiles')
        .select('preferences').eq('id', user.id).abortSignal(controller.signal).maybeSingle();
      if (profileError) throw profileError;
      return completedOnboarding(profile?.preferences) ? '/home' : '/login';
    }

    async function enter() {
      try {
        const timeout = new Promise<never>((_, reject) => {
          timers.push(setTimeout(() => { controller.abort(); reject(new Error('Auth timeout')); }, 12000));
        });
        const [target] = await Promise.all([Promise.race([destination(), timeout]), wait(2000)]);
        if (!active) return;
        setLeaving(true);
        await wait(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180);
        if (active) router.replace(target);
      } catch {
        if (active) setError(true);
      }
    }
    void enter();
    return () => { active = false; controller.abort(); timers.forEach(clearTimeout); };
  }, [attempt, router]);

  return <main className={`${styles.splash} ${leaving ? styles.leaving : ''}`} aria-label="Aller Matrix welcome" aria-busy={!error}>
    <div className={styles.artwork} aria-hidden="true" />
    <div className={styles.brand}>
      <h1><span>Aller</span><span>Matrix</span></h1>
      <p>Food freedom<br />with confidence</p>
    </div>
    <p className={styles.tagline}>Understand your food.<br />Live your life.</p>
    <span className={styles.srOnly} role="status">{error ? 'Unable to initialize your session.' : 'Preparing your experience.'}</span>
    {error && <div className={styles.recovery} role="alert">
      <p>We couldn’t check your session. Check your connection and try again.</p>
      <button onClick={() => { setError(false); setAttempt(value => value + 1); }}>Try again</button>
    </div>}
  </main>;
}
