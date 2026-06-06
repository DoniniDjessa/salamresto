import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return Response.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local — redémarrez le serveur après avoir ajouté la clé.' },
        { status: 500 }
      );
    }

    const { email, name, role } = await req.json();
    if (!email?.trim() || !name?.trim() || !role) {
      return Response.json({ error: 'Champs manquants (email, nom, rôle)' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: '00000000',
      email_confirm: true,
      user_metadata: { name, role },
    });

    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ user: data.user });
  } catch (err: any) {
    return Response.json({ error: err.message ?? 'Erreur serveur' }, { status: 500 });
  }
}
