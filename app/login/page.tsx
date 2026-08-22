"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import "./login.css";

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: data.get("email"),
        password: data.get("password"),
      }),
    });
    if (response.ok) {
      router.replace("/");
      router.refresh();
    } else {
      setError("E-mail ou senha inválidos");
    }
    setLoading(false);
  }

  return (
    <main className="login-shell">
      <form onSubmit={submit}>
        <Image
          src="/monteiro-logo.png"
          alt="Monteiro CRM"
          width={92}
          height={102}
        />
        <span>ACESSO PRIVADO</span>
        <h1>Monteiro CRM</h1>
        <p>Ambiente exclusivo de Franklin Monteiro.</p>
        <label>
          <span>E-mail</span>
          <input
            name="email"
            type="email"
            autoComplete="username"
            autoFocus
            required
          />
        </label>
        <label>
          <span>Senha</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        {error && <b>{error}</b>}
        <button disabled={loading}>
          {loading ? "Verificando..." : "Entrar no CRM"}
        </button>
        <small>
          Sessão protegida por cookie seguro e assinatura criptográfica.
        </small>
      </form>
    </main>
  );
}
