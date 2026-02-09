import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { MessageSquare, Users2, LineChart, ShieldCheck } from "lucide-react";

export default function LandingPage() {
    return (
        <div className="flex flex-col gap-16 pb-16">
            {/* Hero Section */}
            <section className="container px-4 pt-20 text-center">
                <div className="mx-auto max-w-[800px] space-y-4">
                    <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl font-heading">
                        Smarter Lead Management <br className="hidden sm:inline" />
                        <span className="text-primary">for Modern Teams</span>
                    </h1>
                    <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                        CoCRM helps you find, track, and convert leads faster using powerful AI and automation.
                        All in one place.
                    </p>
                    <div className="flex justify-center gap-4 pt-4">
                        <Button size="lg" asChild>
                            <Link to="/join">Get Started for Free</Link>
                        </Button>
                        <Button variant="outline" size="lg" asChild>
                            <Link to="/login">Sign In</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Feature Grid */}
            <section className="container px-4">
                <div className="mx-auto grid max-w-[900px] gap-8 sm:grid-cols-2 lg:grid-cols-2">
                    <div className="rounded-lg border bg-card p-6 shadow-sm">
                        <Users2 className="h-10 w-10 text-primary mb-4" />
                        <h3 className="text-xl font-bold font-heading">Lead Discovery</h3>
                        <p className="mt-2 text-muted-foreground">Find potential customers instantly with our Google Maps integration and bulk import tools.</p>
                    </div>
                    <div className="rounded-lg border bg-card p-6 shadow-sm">
                        <MessageSquare className="h-10 w-10 text-primary mb-4" />
                        <h3 className="text-xl font-bold font-heading">WhatsApp Automation</h3>
                        <p className="mt-2 text-muted-foreground">Send personalized messages and automate follow-ups with AI-driven templates.</p>
                    </div>
                    <div className="rounded-lg border bg-card p-6 shadow-sm">
                        <LineChart className="h-10 w-10 text-primary mb-4" />
                        <h3 className="text-xl font-bold font-heading">Actionable Insights</h3>
                        <p className="mt-2 text-muted-foreground">Track performance metrics and convert more leads with data-driven decisions.</p>
                    </div>
                    <div className="rounded-lg border bg-card p-6 shadow-sm">
                        <ShieldCheck className="h-10 w-10 text-primary mb-4" />
                        <h3 className="text-xl font-bold font-heading">Secure & Private</h3>
                        <p className="mt-2 text-muted-foreground">Enterprise-grade security ensuring your customer data is safe and compliant.</p>
                    </div>
                </div>
            </section>

            {/* Pricing Teaser */}
            <section className="container px-4 text-center">
                <div className="mx-auto max-w-[600px] space-y-4 rounded-xl bg-primary/5 p-8 border border-primary/20">
                    <h2 className="text-3xl font-bold font-heading">Start Your Free Trial</h2>
                    <p className="text-muted-foreground">
                        Get 14 days of full access. No credit card required.
                    </p>
                    <Button size="lg" className="w-full sm:w-auto" asChild>
                        <Link to="/join">Start Free Trial</Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}
