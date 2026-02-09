import { Button } from "@/components/ui/button";
import { Link, Outlet } from "react-router-dom";

export function PublicLayout() {
    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center justify-between px-4">
                    <Link to="/" className="flex items-center space-x-2 font-bold text-xl">
                        <span>CoCRM</span>
                    </Link>
                    <div className="flex items-center space-x-4">
                        <Link to="/login">
                            <Button variant="ghost" size="sm">
                                Login
                            </Button>
                        </Link>
                        <Link to="/join">
                            <Button size="sm">Get Started</Button>
                        </Link>
                    </div>
                </div>
            </header>
            <main className="flex-1">
                <Outlet />
            </main>
            <footer className="border-t py-6 md:py-0">
                <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row px-4">
                    <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
                        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                            Built by CoCRM. The source code is available on <a href="#" className="font-medium underline underline-offset-4">GitHub</a>.
                        </p>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                        <Link to="/privacy" className="hover:underline">Privacy</Link>
                        <Link to="/terms" className="hover:underline">Terms</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
