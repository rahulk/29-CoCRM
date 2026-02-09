import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicyPage() {
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
                <h1>Privacy Policy</h1>
                <p className="lead">Last updated: February 9, 2026</p>

                <h2>1. Introduction</h2>
                <p>Welcome to CoCRM ("we," "our," or "us"). We are committed to protecting your privacy and ensuring you understand how we collect, use, and share your information.</p>

                <h2>2. Information We Collect</h2>
                <ul>
                    <li><strong>Account Information:</strong> When you sign up via Google, we collect your email address, name, and profile picture.</li>
                    <li><strong>Business Data:</strong> Information you input about your business (e.g., name, location).</li>
                    <li><strong>Usage Data:</strong> How you interact with our services, including search queries and message templates.</li>
                </ul>

                <h2>3. How We Use Your Information</h2>
                <p>We use your information to:</p>
                <ul>
                    <li>Provide and improve our CRM and AI services.</li>
                    <li>Authenticate your identity.</li>
                    <li>Process payments and credits.</li>
                    <li>Communicate with you about updates and support.</li>
                </ul>

                <h2>4. Data Sharing</h2>
                <p>We do not sell your personal data. We share data only with:</p>
                <ul>
                    <li><strong>Service Providers:</strong> Firebase (hosting/db), Google Cloud (AI), MSG91 (messaging).</li>
                    <li><strong>Legal Requirements:</strong> If required by law or to protect our rights.</li>
                </ul>

                <h2>5. Your Rights</h2>
                <p>You may request deletion of your account and data at any time by contacting support.</p>
            </main>

            <footer className="py-6 text-center text-muted-foreground text-sm border-t">
                <div className="space-x-4 mb-2">
                    <Link to="/terms" className="hover:underline">Terms of Service</Link>
                </div>
                <p>© 2026 CoCRM. All rights reserved. v{version}</p>
            </footer>
        </div>
    );
}
