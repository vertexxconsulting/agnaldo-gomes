import { NextResponse } from 'next/server';
import { requireStudioAuth } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

async function checkEditPermission(auth: any): Promise<boolean> {
  const role = auth.user!.role;
  // Admins têm acesso total
  if (role === 'STUDIO_ADMIN' || role === 'ADMIN' || role === 'studio_admin') return true;
  
  // Secretaria: verifica as permissões específicas granulares no JSONB "permissions"
  if (role === 'STUDIO_SECRETARIA') {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('permissions')
      .eq('id', auth.user!.id)
      .single();
      
    if (profile?.permissions?.profissionais === 'Edição') {
      return true;
    }
  }
  
  return false;
}

export async function GET() {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  try {
    const [{ data: rawProfs, error }, { data: profiles }] = await Promise.all([
      supabaseAdmin.from('salon_professionals').select('*').order('name'),
      supabaseAdmin.from('profiles').select('id, email, full_name, avatar_url, role, permissions'),
    ]);

    if (error) {
      console.error('[api/profissionais] Erro ao buscar profissionais:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const profsList: any[] = [...(rawProfs || [])];
    const normalize = (t?: string | null) =>
      (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    // Sincronizar automaticamente usuários cadastrados com a função Auxiliar (Cabelo) em profiles
    const auxiliaresProfiles = (profiles || []).filter((p: any) => {
      const perms = (p.permissions || {}) as any;
      const roleStr = String(p.role || '').toLowerCase();
      return (
        roleStr === 'studio_auxiliar' ||
        roleStr === 'auxiliar' ||
        perms.is_auxiliar === true ||
        perms.cargo === 'auxiliar' ||
        perms.tipo === 'auxiliar'
      );
    });

    for (const auxProfile of auxiliaresProfiles) {
      const perms = (auxProfile.permissions || {}) as any;
      const profIdPerm = perms.professional_id;
      const auxEmail = normalize(auxProfile.email);
      const auxName = normalize(auxProfile.full_name);

      let matched = profsList.find((sp: any) =>
        (sp.user_id && sp.user_id === auxProfile.id) ||
        (profIdPerm && sp.id === profIdPerm) ||
        (auxEmail && sp.email && normalize(sp.email) === auxEmail) ||
        (auxName && normalize(sp.name) === auxName)
      );

      if (!matched && auxProfile.full_name) {
        // Cria registro correspondente em salon_professionals para que a Auxiliar (Cabelo) tenha UUID válido na agenda e lista de auxiliares de cadeira
        const schedMeta = {
          _meta: {
            is_auxiliar: true,
            cargo: 'auxiliar',
            role_title: 'Auxiliar (Cabelo)',
          }
        };
        const insertPayload: Record<string, any> = {
          name: String(auxProfile.full_name).trim(),
          user_id: auxProfile.id,
          email: auxProfile.email || null,
          photo_url: auxProfile.avatar_url || null,
          categoria: 'Auxiliar (Cabelo)',
          role_title: 'Auxiliar (Cabelo)',
          specialties: ['Auxiliar (Cabelo)'],
          active: true,
          weekly_schedule: schedMeta,
        };

        const { data: insertedProf, error: insertErr } = await supabaseAdmin
          .from('salon_professionals')
          .insert(insertPayload)
          .select('*')
          .single();

        if (!insertErr && insertedProf) {
          matched = insertedProf;
          profsList.push(insertedProf);
          // Vincula o professional_id de volta no profile
          await supabaseAdmin
            .from('profiles')
            .update({
              permissions: { ...perms, professional_id: insertedProf.id }
            })
            .eq('id', auxProfile.id);
        }
      } else if (matched) {
        // Garante que o registro existente esteja marcado como Auxiliar (Cabelo) e vinculado ao user_id
        matched.is_auxiliar = true;
        matched.cargo = 'Auxiliar (Cabelo)';
        matched.role_title = 'Auxiliar (Cabelo)';
        if (!matched.categoria || matched.categoria === 'Cabelo') matched.categoria = 'Auxiliar (Cabelo)';

        if (!matched.user_id || matched.role_title !== 'Auxiliar (Cabelo)') {
          const sched = (matched.weekly_schedule && typeof matched.weekly_schedule === 'object')
            ? { ...matched.weekly_schedule }
            : {};
          sched._meta = { ...(sched._meta || {}), is_auxiliar: true, cargo: 'auxiliar', role_title: 'Auxiliar (Cabelo)' };
          await supabaseAdmin
            .from('salon_professionals')
            .update({
              user_id: matched.user_id || auxProfile.id,
              role_title: 'Auxiliar (Cabelo)',
              categoria: matched.categoria || 'Auxiliar (Cabelo)',
              weekly_schedule: sched,
            })
            .eq('id', matched.id);
        }
      }
    }

    // Enriquecer todos os profissionais respeitando a coluna `categoria` do banco de dados
    const enrichedProfs = profsList.map((sp: any) => {
      const sched = (sp.weekly_schedule || {}) as any;
      const dbCategoria = typeof sp.categoria === 'string' && sp.categoria.trim() ? sp.categoria.trim() : null;
      const roleTitle = sp.role_title || sp.cargo || sched?._meta?.role_title || sched?._meta?.cargo || null;
      const catIsExplicitNonAux = Boolean(
        dbCategoria &&
        dbCategoria.toLowerCase() !== 'cabelo' &&
        !dbCategoria.toLowerCase().includes('auxiliar')
      );
      const isAux = Boolean(
        (dbCategoria && dbCategoria.toLowerCase().includes('auxiliar')) ||
        (!catIsExplicitNonAux && (
          sp.is_auxiliar ||
          sched?._meta?.is_auxiliar ||
          (typeof roleTitle === 'string' && roleTitle.toLowerCase().includes('auxiliar')) ||
          (Array.isArray(sp.specialties) && sp.specialties.some((s: string) => typeof s === 'string' && s.toLowerCase().includes('auxiliar')))
        ))
      );
      const finalCategoria = dbCategoria
        ? (isAux && dbCategoria.toLowerCase() === 'cabelo' ? 'Auxiliar (Cabelo)' : dbCategoria)
        : (isAux ? 'Auxiliar (Cabelo)' : 'Cabeleireiro(a)');
      return {
        ...sp,
        categoria: finalCategoria,
        is_auxiliar: isAux,
        cargo: isAux ? 'Auxiliar (Cabelo)' : (dbCategoria || roleTitle),
        role_title: isAux ? 'Auxiliar (Cabelo)' : (sp.role_title || dbCategoria || roleTitle),
      };
    });

    enrichedProfs.sort((a: any, b: any) => String(a.name || '').localeCompare(String(b.name || '')));

    return NextResponse.json(enrichedProfs);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  const canEdit = await checkEditPermission(auth);
  if (!canEdit) {
    return NextResponse.json({ error: 'Permissão negada. O admin não liberou acesso de Edição para profissionais na sua conta.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, nome, foto_url, categoria, especialidades, ativo, jornada_semanal, stock_pin, product_commission_pct, periodo_recebimento, cargo, role_title, is_auxiliar, profile_id } = body;

    if (!nome) {
      return NextResponse.json({ error: 'Nome do profissional é obrigatório.' }, { status: 400 });
    }

    const sched = (jornada_semanal ? { ...jornada_semanal } : {}) as any;
    if (stock_pin !== undefined) {
      sched._meta = { ...sched._meta, stock_pin: stock_pin ? String(stock_pin).trim() : null };
    }
    if (periodo_recebimento !== undefined) {
      sched._meta = { ...sched._meta, periodo_recebimento: periodo_recebimento || 'semanal' };
    }
    if (is_auxiliar !== undefined || cargo !== undefined || role_title !== undefined) {
      const auxFlag = Boolean(is_auxiliar || (typeof cargo === 'string' && cargo.toLowerCase().includes('auxiliar')) || (typeof role_title === 'string' && role_title.toLowerCase().includes('auxiliar')));
      sched._meta = {
        ...sched._meta,
        is_auxiliar: auxFlag,
        cargo: auxFlag ? 'auxiliar' : (cargo || null),
        role_title: auxFlag ? 'Auxiliar (Cabelo)' : (role_title || cargo || null),
      };
    }

    const payload: Record<string, any> = {
      name: String(nome).trim(),
      photo_url: foto_url || null,
      categoria: categoria || null,
      specialties: Array.isArray(especialidades) ? especialidades : [],
      active: ativo ?? true,
      weekly_schedule: sched,
    };

    if (profile_id) {
      payload.user_id = profile_id;
    }
    if (is_auxiliar !== undefined || role_title !== undefined || cargo !== undefined) {
      const auxFlag = Boolean(is_auxiliar || (typeof cargo === 'string' && cargo.toLowerCase().includes('auxiliar')) || (typeof role_title === 'string' && role_title.toLowerCase().includes('auxiliar')));
      payload.role_title = auxFlag ? 'Auxiliar (Cabelo)' : (role_title || cargo || null);
    }
    if (product_commission_pct !== undefined) {
      payload.product_commission_pct = Number(product_commission_pct) || 0;
    }
    if (stock_pin !== undefined) {
      payload.stock_pin = stock_pin ? String(stock_pin).trim() : null;
    }
    if (periodo_recebimento !== undefined) {
      payload.commission_frequency = periodo_recebimento;
    }

    const isUUID = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUUID) {
      // Usando supabaseAdmin pois a role de Secretaria não tem update no RLS
      let { data, error } = await supabaseAdmin
        .from('salon_professionals')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error && (error.message?.includes('stock_pin') || error.message?.includes('commission_frequency'))) {
        delete payload.stock_pin;
        delete payload.commission_frequency;
        const retry = await supabaseAdmin
          .from('salon_professionals')
          .update(payload)
          .eq('id', id)
          .select('*')
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error('[api/profissionais] Erro ao atualizar profissional:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, profissional: data });
    } else {
      // Usando supabaseAdmin pois a role de Secretaria não tem insert no RLS
      let { data, error } = await supabaseAdmin
        .from('salon_professionals')
        .insert(payload)
        .select('*')
        .single();

      if (error && (error.message?.includes('stock_pin') || error.message?.includes('commission_frequency'))) {
        delete payload.stock_pin;
        delete payload.commission_frequency;
        const retry = await supabaseAdmin
          .from('salon_professionals')
          .insert(payload)
          .select('*')
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error('[api/profissionais] Erro ao criar profissional:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, profissional: data });
    }
  } catch (err) {
    console.error('[api/profissionais] Erro inesperado:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireStudioAuth();
  if (auth.error) return auth.error;

  const canEdit = await checkEditPermission(auth);
  if (!canEdit) {
    return NextResponse.json({ error: 'Permissão negada. Você não tem acesso de edição/exclusão para profissionais.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do profissional é obrigatório.' }, { status: 400 });
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUUID) {
      return NextResponse.json({ success: true, message: 'Mock id ignorado' });
    }

    // 1. Remove vínculos (usando supabaseAdmin)
    await supabaseAdmin.from('salon_professional_services').delete().eq('professional_id', id);

    // 2. Remove o profissional (usando supabaseAdmin)
    const { error } = await supabaseAdmin
      .from('salon_professionals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[api/profissionais] Erro ao excluir profissional:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[api/profissionais] Erro inesperado ao excluir profissional:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}