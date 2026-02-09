import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginScreen() {
    return (
        <div className="flex h-screen items-center justify-center bg-muted/50 p-4">
            <div className="w-full max-w-md">
                <LoginForm />
                <p className="mt-4 text-center text-sm text-muted-foreground">
                    Don't have an account? <a href="#" className="underline">Sign up</a>.
                </p>
            </div>
        </div>
    );
}
