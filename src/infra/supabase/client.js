// Cliente do Supabase, criado uma vez só e só quando o login é usado.
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

let cliente = null;

/** Login só fora do claude.ai: lá os dados já ficam na conta do claude.ai (window.claude). */
export function loginDisponivel() {
  try { return !(window.claude && typeof window.claude.use === 'function'); } catch (e) { return false; }
}

export function obterCliente() {
  if (cliente) return cliente;
  // testes automáticos trocam o servidor por um falso (ver tests/e2e/fases/fase20.test.js)
  // só um objeto de verdade: um elemento HTML com esse id também aparece em window (DOM clobbering)
  const falso = window.__cortaSupabaseFake;
  if (falso && typeof falso === 'object' && !(falso instanceof Node) && falso.auth) { cliente = falso; return cliente; }
  cliente = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
  });
  return cliente;
}
