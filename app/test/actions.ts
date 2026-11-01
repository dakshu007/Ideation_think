'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/supabase/server';

const UUID = /^[0-9a-f-]{36}$/i;

function clean(message: string) {
  // Database errors raised by our own functions are written for humans; hide anything else.
  return message.length < 120 && !/violates|relation|column|syntax/i.test(message) ? message : 'Something went wrong. Please try again.';
}

export async function joinApp(formData: FormData) {
  const id = String(formData.get('app_id') ?? '');
  if (!UUID.test(id)) redirect('/test');
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('join_app', { p_app_id: id });
  if (error) redirect('/test?error=' + encodeURIComponent(clean(error.message)));
  revalidatePath('/test');
  redirect('/test?joined=1');
}

export async function checkIn(formData: FormData) {
  const id = String(formData.get('assignment_id') ?? '');
  if (!UUID.test(id)) redirect('/test');
  const feedback = String(formData.get('feedback') ?? '').slice(0, 500);
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc('check_in', { p_assignment_id: id, p_feedback: feedback || null });
  if (error) redirect('/test?error=' + encodeURIComponent(clean(error.message)));
  revalidatePath('/test');
  revalidatePath('/dashboard');
  redirect('/test');
}

export async function leaveApp(formData: FormData) {
  const id = String(formData.get('assignment_id') ?? '');
  if (!UUID.test(id)) redirect('/test');
  const { supabase } = await requireUser();
  await supabase.rpc('leave_app', { p_assignment_id: id });
  revalidatePath('/test');
  redirect('/test');
}
