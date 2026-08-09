import { useState, type FormEvent } from "react";
import { apiFetch } from "../lib/api";
import type { User } from "../types/user";

type AuthScreenProps = {
    onAuthenticated: (user: User) => void;
};

export default function AuthScreen({
    onAuthenticated,
}: AuthScreenProps) {
    const [mode, setMode] = useState< "login" | "register">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);


    async function handleSubmit(event: FormEvent<HTMLFormElement>){
        event.preventDefault();
        setError("");
        setMessage("");
        setIsSubmitting(true);

        try {
            const response = await apiFetch(
                mode === "login" ? "/auth/login" : "/auth/register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type" : "application/json",
                    },
                    body: JSON.stringify({email, password}),
                },

            );
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error ?? "Unable to continue");
            }

            if (mode === "register") {
                setMessage("Account created. Please sign in ");
                setMode("login");
                setPassword("");
                return;
            }
            onAuthenticated(data.user);
        }catch (error) {
            setError(
                error instanceof Error ? error.message: "Something went wrong",
            );
        }finally{
            setIsSubmitting(false);
        }
    }

    return(
        <main className= "auth-shell">
            <section className="auth-card">
                <p className="eyebrow">Job search workspace</p>
                <h1>{mode === "login" ? "Welcome back" : "create an account"}</h1>

                <form onSubmit={handleSubmit}  className="auth-form">
                    <label>
                        <span>Email</span>
                        <input
                        type="email"
                        value={email}
                        onChange={(event)=> setEmail(event.target.value)}
                        autoComplete="email"
                        required
                        />
                    </label>

                    <label>
                        <span>Password</span>
                        <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                    }
                    minLength={12}
                    required
                    />
                    </label>

                    {error && <p className= "message error">{error}</p>}
                    {message && <p className= "message">{message}</p>}

                    <button type="submit" disabled={isSubmitting}>
                        {isSubmitting? "Please Wait"
                        : mode === "login"
                        ? "Sign in"
                        : "Create an account"}
                    </button>
                </form>

                <button
                type="button"
                className="text-button"
                onClick={() =>{
                    setMode(mode === "login" ? "register" : "login");
                    setError("");
                    setMessage("");
                }}
                >
                    {mode === "login"
                    ? "Need an account? Register"
                :"Already have an account ? Sign in "}
                </button>
            </section>
        </main>
    );
}
