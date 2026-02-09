import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function TermsOfServicePage() {
    const version = import.meta.env.VITE_APP_VERSION || '1.0.0';

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="px-6 h-16 flex items-center border-b">
                <Link to="/" className="flex items-center gap-2 font-bold text-xl">
                    <span className="text-primary">CoCRM</span>
                </Link>
                <div className="ml-auto">
                    <Button variant="ghost" asChild>
                        <Link to="/login">Sign In</Link>
                    </Button>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-12 max-w-3xl prose dark:prose-invert">
                <h1>Terms of Service</h1>
                <p className="lead">Last updated: February 9, 2026</p>

                <h2>1. Acceptance of Terms</h2>
                <p>By accessing or using CoCRM, you agree to be bound by these Terms. If you do not agree, you may not use the service.</p>

                <h2>2. Use of Service</h2>
                <p>You agree to use CoCRM only for lawful business purposes. You explicitly agree NOT to:</p>
                <ul>
                    <li>Send spam or unsolicited messages in violation of WhatsApp policies.</li>
                    <li>Scrape data excessively or maliciously.</li>
                    <li>Reverse engineer the platform.</li>
                </ul>

                <h2>3. Billing and Credits</h2>
                <p>CoCRM operates on a prepaid credit system. Credits are non-refundable unless required by law.</p>

                <h2>4. AI Disclaimer</h2>
                <p>Our service uses Artificial Intelligence. Outputs may occasionally be inaccurate. You are responsible for verifying AI-generated content before sending it.</p>

                <h2>5. Limitation of Liability</h2>
                <p>CoCRM is provided "as is." We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
            </main>

            <footer className="py-6 text-center text-muted-foreground text-sm border-t">
                <div className="space-x-4 mb-2">
                    <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
                </div>
                <p>© 2026 CoCRM. All rights reserved. v{version}</p>
            </footer>
        </div>
    );
}
