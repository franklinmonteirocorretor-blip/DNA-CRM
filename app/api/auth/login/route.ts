import {NextResponse} from "next/server";
import {createSession,verifyPassword} from "@/lib/session";
export const runtime="nodejs";
export async function POST(request:Request){const {password}=await request.json();if(!verifyPassword(String(password||"")))return NextResponse.json({error:"Senha inválida"},{status:401});const response=NextResponse.json({ok:true});response.cookies.set("monteiro_session",createSession(),{httpOnly:true,sameSite:"strict",secure:process.env.NODE_ENV==="production",path:"/",maxAge:604800});return response}
