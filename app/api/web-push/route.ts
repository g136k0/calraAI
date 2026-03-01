import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import webpush from 'web-push';

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(
        'mailto:admin@caltra.app',
        vapidPublicKey,
        vapidPrivateKey
    );
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        // If the request is to save a subscription
        if (body.action === 'subscribe') {
            const { subscription } = body;

            // Save subscription to database
            const { error } = await supabase
                .from('push_subscriptions')
                .insert({
                    user_id: user.id,
                    subscription: subscription
                });

            // Check if conflict and update if necessary... wait, I did not add unique constraint on subscription endpoint
            // Let's just catch and ignore duplicates for now or use upsert if needed

            if (error && error.code !== '23505') { // Ignore unique violation if we add it
                console.error('Error saving subscription:', error);
                return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
            }

            return NextResponse.json({ success: true, message: 'Subscribed successfully' });
        }

        // Test push notification trigger
        if (body.action === 'test-push') {
            const { data: subs, error } = await supabase
                .from('push_subscriptions')
                .select('subscription')
                .eq('user_id', user.id);

            if (error || !subs || subs.length === 0) {
                return NextResponse.json({ error: 'No subscriptions found' }, { status: 404 });
            }

            const payload = JSON.stringify({
                title: 'Test Notification',
                body: 'Push notifications are working!',
            });

            const sendPromises = subs.map((sub: any) =>
                webpush.sendNotification(sub.subscription, payload)
            );

            await Promise.all(sendPromises);

            return NextResponse.json({ success: true, message: 'Notifications sent' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Web push error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
