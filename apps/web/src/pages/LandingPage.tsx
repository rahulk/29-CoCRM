import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, MessageCircle, ClipboardList, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
    const version = import.meta.env.VITE_APP_VERSION || '1.0.0';

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* A. Navigation Bar */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center px-4 md:px-6">
                    <div className="flex items-center gap-2 font-bold text-xl cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <span className="text-primary">CoCRM</span>
                    </div>
                    <nav className="hidden md:flex ml-6 gap-6 text-sm font-medium">
                        <button onClick={() => scrollToSection('features')} className="transition-colors hover:text-foreground/80 text-foreground/60">Features</button>
                        <button onClick={() => scrollToSection('how-it-works')} className="transition-colors hover:text-foreground/80 text-foreground/60">How It Works</button>
                        <button onClick={() => scrollToSection('pricing')} className="transition-colors hover:text-foreground/80 text-foreground/60">Pricing</button>
                    </nav>
                    <div className="ml-auto flex items-center gap-4">
                        <span className="text-xs text-muted-foreground hidden sm:inline-block">v{version}</span>
                        <Button variant="ghost" asChild className="hidden sm:inline-flex">
                            <Link to="/login">Sign In</Link>
                        </Button>
                        <Button asChild>
                            <Link to="/login">Get Started Free</Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {/* B. Hero Section */}
                <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32 bg-gradient-to-b from-background to-muted/30">
                    <div className="container flex max-w-[64rem] flex-col items-center gap-4 text-center mx-auto px-4">
                        <Badge variant="outline" className="px-3 py-1 text-sm rounded-full">
                            🚀 Now serving Study Centers & Gyms
                        </Badge>
                        <h1 className="font-heading text-4xl font-extrabold sm:text-5xl md:text-6xl lg:text-7xl leading-tight">
                            Your AI Sales Assistant <br className="hidden md:block" /> That <span className="text-primary">Never Sleeps</span>
                        </h1>
                        <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
                            Find leads on Google Maps. Reach them on WhatsApp. Close deals 10x faster.
                            Everything automated, so you can focus on your business.
                        </p>
                        <div className="space-x-4">
                            <Button size="lg" className="h-12 px-8 text-lg" asChild>
                                <Link to="/login">Start Free Trial</Link>
                            </Button>
                            <Button size="lg" variant="outline" className="h-12 px-8 text-lg" onClick={() => scrollToSection('how-it-works')}>
                                See How It Works
                            </Button>
                        </div>
                        {/* Placeholder for Hero Visual */}
                        <div className="mt-8 rounded-lg border bg-background p-2 shadow-2xl skew-y-1 transform transition-all hover:skew-y-0 duration-500 w-full max-w-4xl mx-auto hidden md:block">
                            <div className="aspect-[16/9] w-full rounded bg-muted/20 flex items-center justify-center border border-dashed">
                                <span className="text-muted-foreground">App Dashboard Preview</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* C. Features Section */}
                <section id="features" className="container space-y-6 py-8 md:py-12 lg:py-24 mx-auto px-4">
                    <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
                        <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-5xl font-bold">
                            Everything you need to grow
                        </h2>
                        <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
                            Powerful tools integrated into one seamless workflow.
                        </p>
                    </div>
                    <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
                        <Card className="flex flex-col items-center text-center p-4">
                            <CardHeader>
                                <div className="p-2 bg-primary/10 rounded-full mb-2">
                                    <MapPin className="h-8 w-8 text-primary" />
                                </div>
                                <CardTitle className="text-xl">Find Leads Instantly</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    Scrape Google Maps for high-intent leads in your area. Get phone numbers and details in seconds.
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="flex flex-col items-center text-center p-4">
                            <CardHeader>
                                <div className="p-2 bg-primary/10 rounded-full mb-2">
                                    <MessageCircle className="h-8 w-8 text-primary" />
                                </div>
                                <CardTitle className="text-xl">Message on WhatsApp</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    Send personalized AI-crafted templates instantly. Engage customers where they are most active.
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="flex flex-col items-center text-center p-4">
                            <CardHeader>
                                <div className="p-2 bg-primary/10 rounded-full mb-2">
                                    <ClipboardList className="h-8 w-8 text-primary" />
                                </div>
                                <CardTitle className="text-xl">Never Miss a Follow-up</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    Smart task management ensures every lead gets attention. Track status from 'New' to 'Converted'.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </section>

                {/* D. How It Works Section */}
                <section id="how-it-works" className="container py-8 md:py-12 lg:py-24 bg-muted/50 mx-auto px-4">
                    <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center mb-12">
                        <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-5xl font-bold">
                            Simple 3-Step Process
                        </h2>
                    </div>
                    <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
                        <div className="relative flex flex-col items-center gap-4 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">1</div>
                            <h3 className="text-xl font-bold">Search</h3>
                            <p className="text-muted-foreground">Enter a keyword (e.g., "Gyms in Mumbai") and let our AI scour the map for businesses.</p>
                        </div>
                        <div className="relative flex flex-col items-center gap-4 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">2</div>
                            <h3 className="text-xl font-bold">AI Scores</h3>
                            <p className="text-muted-foreground">We verify and rank leads based on quality, so you only target the best prospects.</p>
                        </div>
                        <div className="relative flex flex-col items-center gap-4 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">3</div>
                            <h3 className="text-xl font-bold">Reach Out</h3>
                            <p className="text-muted-foreground">One-click connect via WhatsApp using high-conversion templates.</p>
                        </div>
                    </div>
                </section>

                {/* E. Pricing Section */}
                <section id="pricing" className="container py-8 md:py-12 lg:py-24 mx-auto px-4">
                    <div className="mx-auto flex w-full flex-col gap-4 md:max-w-[58rem]">
                        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center mb-8">
                            <h2 className="font-heading text-3xl leading-[1.1] sm:text-3xl md:text-5xl font-bold">
                                Simple, Transparent Pricing
                            </h2>
                            <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
                                Start for free. Scale as you grow.
                            </p>
                        </div>
                        <div className="grid w-full items-start gap-10 rounded-lg border p-10 md:grid-cols-[1fr_200px] shadow-lg bg-card">
                            <div className="grid gap-6">
                                <h3 className="text-2xl font-bold sm:text-3xl">Free Trial</h3>
                                <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                                    <li className="flex items-center"><CheckCircle2 className="mr-2 h-4 w-4 text-primary" /> 7-Day Access</li>
                                    <li className="flex items-center"><CheckCircle2 className="mr-2 h-4 w-4 text-primary" /> ₹500 credits included</li>
                                    <li className="flex items-center"><CheckCircle2 className="mr-2 h-4 w-4 text-primary" /> Full feature access</li>
                                    <li className="flex items-center"><CheckCircle2 className="mr-2 h-4 w-4 text-primary" /> No credit card required</li>
                                </ul>
                            </div>
                            <div className="flex flex-col gap-4 text-center">
                                <div className="text-4xl font-bold">₹0</div>
                                <p className="text-sm text-muted-foreground">for 7 days</p>
                                <Button size="lg" asChild>
                                    <Link to="/login">Start My Free Trial</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* F. Footer */}
            <footer className="border-t py-6 md:py-0">
                <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row mx-auto px-4">
                    <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
                        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                            © 2026 CoCRM. All rights reserved.
                        </p>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                        <Link to="/privacy" className="hover:underline underline-offset-4">Privacy Policy</Link>
                        <Link to="/terms" className="hover:underline underline-offset-4">Terms of Service</Link>
                        <span className="text-xs border px-2 py-0.5 rounded bg-muted">v{version}</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
