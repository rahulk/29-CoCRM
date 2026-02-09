export default function TermsOfServicePage() {
    return (
        <div className="container max-w-prose py-8 space-y-4">
            <h1 className="text-3xl font-bold font-heading">Terms of Service</h1>
            <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

            <h2 className="text-xl font-bold mt-8">Agreement to Terms</h2>
            <p>
                These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and CoCRM ("we," "us" or "our"),
                concerning your access to and use of the Services software as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto.
            </p>

            <h2 className="text-xl font-bold mt-8">User Representations</h2>
            <p>
                By using the Services, you represent and warrant that:
                (1) all registration information you submit will be true, accurate, current, and complete;
                (2) you will maintain the accuracy of such information and promptly update such registration information as necessary;
            </p>

            <h2 className="text-xl font-bold mt-8">Prohibited Activities</h2>
            <p>
                You may not access or use the Services for any purpose other than that for which we make the Services available.
                The Services may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us.
            </p>

            <h2 className="text-xl font-bold mt-8">Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at support@cocrm.example.com.</p>
        </div>
    );
}
