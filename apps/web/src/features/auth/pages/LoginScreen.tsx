import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginScreen() {
    return (
        <div className="flex h-screen items-center justify-center bg-muted/50 p-4">
            <div className="w-full max-w-md">
                <LoginForm />
            </div>
        </div>
    );
}
