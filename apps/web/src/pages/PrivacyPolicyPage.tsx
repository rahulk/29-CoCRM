export default function PrivacyPolicyPage() {
    return (
        <div className="container max-w-prose py-8 space-y-4">
            <h1 className="text-3xl font-bold font-heading">Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

            <h2 className="text-xl font-bold mt-8">Introduction</h2>
            <p>
                At CoCRM, we are committed to protecting your personal information and your right to privacy.
                This Privacy Policy explains what information we collect, how we use it, and what rights you have.
            </p>

            <h2 className="text-xl font-bold mt-8">Information We Collect</h2>
            <p>
                We collect personal information that you voluntarily provide to us when registering at the Services expressing an interest in obtaining information about us or our products and services,
                when participating in activities on the Services or otherwise contacting us.
            </p>

            <h2 className="text-xl font-bold mt-8">How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2">
                <li>To provide and maintain our Service.</li>
                <li>To notify you about changes to our Service.</li>
                <li>To allow you to participate in interactive features of our Service.</li>
                <li>To provide customer support.</li>
            </ul>

            <h2 className="text-xl font-bold mt-8">Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at support@cocrm.example.com.</p>
        </div>
    );
}
