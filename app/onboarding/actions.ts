'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { parsePlayLink } from '@/lib/playlink';
import { requireUser } from '@/lib/supabase/server';

const ANDROID_VERSIONS = ['Android 16', 'Android 15', 'Android 14', 'Android 13 or older'];
const LOADS: Record<string, number> = { '5': 5, '10': 10, '15': 15 };

export async function saveSetup(formData: FormData) {
  const { supabase, user } = await requireUser();

  const goal = formData.get('goal') === 'test' ? 'test' : 'get';
  const version = String(formData.get('android_version') ?? '');
  const load = LOADS[String(formData.get('apps_per_day') ?? '10')] ?? 10;

  const { error } = await supabase
    .from('profiles')
    .update({
      goal,
      android_version: ANDROID_VERSIONS.includes(version) ? version : null,
      apps_per_day: load,
      // People who only want to test are done after step 1.
      onboarded: goal === 'test',
    })
    .eq('id', user.id);

  if (error) redirect('/onboarding?error=' + encodeURIComponent('Could not save. Please try again.'));
  redirect(goal === 'test' ? '/test' : '/onboarding/app');
}

export async function addApp(formData: FormData) {
  const { supabase, user } = await requireUser();
  const back = (msg: string) => redirect('/onboarding/app?error=' + encodeURIComponent(msg));

  const pkg = parsePlayLink(String(formData.get('link') ?? ''));
  if (!pkg) back('That doesn’t look like a Google Play test link. It should start with https://play.google.com/apps/testing/');

  const appName = String(formData.get('app_name') ?? '').trim().slice(0, 60);
  if (!appName) back('Please add your app’s name.');
  if (formData.get('group_added') !== 'on') back('Add the TestLoop Google Group to your closed test first, then tick the box.');

  const { error } = await supabase.from('apps').insert({ owner_id: user.id, package_name: pkg!, app_name: appName });
  if (error) {
    if (error.code === '23505') back('This app is already on TestLoop.');
    back(error.message.includes('up to 3') ? 'You can run up to 3 tests at a time.' : 'Could not add the app. Please try again.');
  }

  await supabase.from('profiles').update({ onboarded: true }).eq('id', user.id);
  revalidatePath('/dashboard');
  redirect('/dashboard?added=1');
}

export async function skipAddApp() {
  const { supabase, user } = await requireUser();
  await supabase.from('profiles').update({ onboarded: true }).eq('id', user.id);
  redirect('/dashboard');
}
