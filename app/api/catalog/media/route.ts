import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { documentsBucket, supabaseAdmin } from "@/lib/supabase-admin";

export const runtime="nodejs";

export async function POST(request:Request){
  try{
    const body=await request.json();const projectId=Number(body.projectId);
    if(!projectId||!body.name||!body.type)return NextResponse.json({error:"Arquivo e empreendimento são obrigatórios."},{status:400});
    if(!String(body.type).startsWith("image/")&&!String(body.type).startsWith("video/"))return NextResponse.json({error:"Envie somente foto ou vídeo."},{status:415});
    const supabase=supabaseAdmin();const {count,error:countError}=await supabase.from("documents").select("id",{count:"exact",head:true}).eq("project_id",projectId).eq("document_type","PROJECT_MEDIA");if(countError)throw countError;
    if((count||0)>=10)return NextResponse.json({error:"Limite de 10 mídias por empreendimento atingido."},{status:422});
    if(body.action==="prepare"){
      const extension=String(body.name).split(".").pop()?.replace(/[^a-z0-9]/gi,"")||"bin";const path=`empreendimentos/${projectId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const {data,error}=await supabase.storage.from(documentsBucket()).createSignedUploadUrl(path);if(error)throw error;
      return NextResponse.json({ok:true,path,signedUrl:data.signedUrl});
    }
    if(body.action==="complete"&&body.path){
      const {error}=await supabase.from("documents").insert({project_id:projectId,document_type:"PROJECT_MEDIA",file_name:String(body.name),storage_path:String(body.path),mime_type:String(body.type)});if(error)throw error;
      return NextResponse.json({ok:true});
    }
    return NextResponse.json({error:"Operação inválida."},{status:400});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Falha ao anexar mídia."},{status:500})}
}

export async function DELETE(request:Request){
  try{
    const {id}=await request.json();const supabase=supabaseAdmin();const {data,error}=await supabase.from("documents").select("storage_path").eq("id",id).eq("document_type","PROJECT_MEDIA").maybeSingle();if(error||!data)return NextResponse.json({error:error?.message||"Mídia não encontrada."},{status:404});
    const {error:storageError}=await supabase.storage.from(documentsBucket()).remove([data.storage_path]);if(storageError)throw storageError;
    const {error:deleteError}=await supabase.from("documents").delete().eq("id",id);if(deleteError)throw deleteError;
    return NextResponse.json({ok:true});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Falha ao excluir mídia."},{status:500})}
}
