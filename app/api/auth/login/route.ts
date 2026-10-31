import { NextResponse } from "next/server";
import { issueFinanceSession, FINANCE_COOKIE } from '@/services/finance-auth';

export async function POST(request: Request) {
	const { email, password } = await request.json();
	const apiUrl = process.env.API_URL || "https://api-renovada.jbmidia.com";

	try {
		const upstream = await fetch(`${apiUrl}/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
			cache: "no-store",
		});

		if (!upstream.ok) {
			return NextResponse.json(
				{ error: upstream.status === 401 || upstream.status === 403 ? "Credenciais inválidas." : "Não foi possível entrar. Tente novamente." },
				{ status: upstream.status },
			);
		}

		const data = await upstream.json();
		if (!data.token || !data.user?.roles) {
			return NextResponse.json({ error: "Resposta inválida do servidor." }, { status: 502 });
		}

		const response = NextResponse.json({ success: true });
        if (data.user.id && process.env.FINANCE_SESSION_SECRET) {
            response.cookies.set(FINANCE_COOKIE, issueFinanceSession(data.token, data.user.id), { maxAge: 8 * 3600, httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' });
        }
		const expires = new Date(Date.now() + 23 * 60 * 60 * 1000);
		response.cookies.set("token", data.token, { expires, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
		response.cookies.set("roles", data.user.roles, { expires, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
		return response;
	} catch {
		return NextResponse.json({ error: "Não foi possível conectar ao servidor. Tente novamente." }, { status: 502 });
	}
}
