import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

export interface RequestContext {
  user: User;
  tenantId: string;
  role: string;
  userClient: SupabaseClient;
  adminClient: SupabaseClient;
}

export async function getRequestContext(req: Request): Promise<RequestContext> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = req.headers.get('Authorization');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('Supabase não configurado na função.');
  }
  if (!authorization?.startsWith('Bearer ')) {
    throw new Error('Não autenticado.');
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) throw new Error('Sessão inválida.');

  const { data: profile, error: profileError } = await adminClient
    .from('perfis_pj')
    .select('tenant_id,cargo')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile?.tenant_id) {
    throw new Error('Usuário sem empresa vinculada.');
  }

  return {
    user: authData.user,
    tenantId: profile.tenant_id,
    role: profile.cargo,
    userClient,
    adminClient,
  };
}

export function requireTenantAdmin(context: RequestContext) {
  if (!['admin_tenant', 'super_admin'].includes(context.role)) {
    throw new Error('Apenas administradores podem executar esta operação.');
  }
}
