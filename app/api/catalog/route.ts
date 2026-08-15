import { NextResponse } from "next/server";
import { documentsBucket, supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

async function catalog() {
  const supabase=supabaseAdmin();
  const [buildersResult,projectsResult,documentsResult]=await Promise.all([
    supabase.from("builders").select("id,name,category,contact_name,phone,regions,active").eq("active",true).order("name"),
    supabase.from("projects").select("id,builder_id,name,kind,region,sale_price,commission_rate,active").eq("active",true).order("name"),
    supabase.from("documents").select("id,project_id,document_type,file_name,storage_path,mime_type,created_at").in("document_type",["PROJECT_MEDIA","PROJECT_DESCRIPTION"]).order("created_at"),
  ]);
  const error=buildersResult.error||projectsResult.error||documentsResult.error;if(error)throw error;
  const documents=documentsResult.data||[];
  const mediaDocuments=documents.filter(item=>item.document_type==="PROJECT_MEDIA");
  const signed=new Map<number,string>();
  await Promise.all(mediaDocuments.map(async item=>{const {data}=await supabase.storage.from(documentsBucket()).createSignedUrl(item.storage_path,3600);if(data?.signedUrl)signed.set(item.id,data.signedUrl)}));
  return (buildersResult.data||[]).map(builder=>({
    id:builder.id,name:builder.name,category:builder.category,contact:builder.contact_name||"",phone:builder.phone||"",regions:String(builder.regions||"").split(",").map(item=>item.trim()).filter(Boolean),
    projects:(projectsResult.data||[]).filter(project=>project.builder_id===builder.id).map(project=>({
      id:project.id,name:project.name,kind:project.kind||"",region:project.region||"",price:Number(project.sale_price||0),commission:Number(project.commission_rate||0),
      description:documents.find(item=>item.project_id===project.id&&item.document_type==="PROJECT_DESCRIPTION")?.file_name||"",
      media:mediaDocuments.filter(item=>item.project_id===project.id).map(item=>({id:item.id,name:item.file_name,type:item.mime_type||"",url:signed.get(item.id)||""})),
    })),
  }));
}

export async function GET(){try{return NextResponse.json(await catalog())}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Falha ao carregar catálogo."},{status:500})}}

export async function POST(request:Request){
  try{
    const body=await request.json();const supabase=supabaseAdmin();
    if(body.entity==="builder"){
      if(!String(body.name||"").trim())return NextResponse.json({error:"Nome da construtora é obrigatório."},{status:400});
      const {data,error}=await supabase.from("builders").insert({name:String(body.name).trim(),category:body.category||"Mista",contact_name:body.contact||null,phone:body.phone||null,regions:(body.regions||[]).join(", "),active:true}).select("id").single();if(error)throw error;
      return NextResponse.json({ok:true,id:data.id});
    }
    if(body.entity==="project"){
      const price=Number(body.price);if(!body.builderId||!String(body.name||"").trim()||!Number.isFinite(price))return NextResponse.json({error:"Construtora, empreendimento e valor de venda são obrigatórios."},{status:400});
      const {data,error}=await supabase.from("projects").insert({builder_id:body.builderId,name:String(body.name).trim(),kind:body.kind||null,region:body.region||null,sale_price:price,commission_rate:Number(body.commission)||0,available_units:0,active:true}).select("id").single();if(error)throw error;
      if(String(body.description||"").trim())await supabase.from("documents").insert({project_id:data.id,document_type:"PROJECT_DESCRIPTION",file_name:String(body.description).trim(),storage_path:"inline://description",mime_type:"text/plain"});
      return NextResponse.json({ok:true,id:data.id});
    }
    return NextResponse.json({error:"Operação inválida."},{status:400});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Falha ao cadastrar."},{status:500})}
}

export async function PATCH(request:Request){
  try{
    const body=await request.json();const supabase=supabaseAdmin();
    if(body.entity==="builder"){
      const {error}=await supabase.from("builders").update({name:String(body.name).trim(),category:body.category,contact_name:body.contact||null,phone:body.phone||null,regions:(body.regions||[]).join(", ")}).eq("id",body.id);if(error)throw error;
    }else if(body.entity==="project"){
      const price=Number(body.price);if(!Number.isFinite(price))return NextResponse.json({error:"Valor de venda inválido."},{status:400});
      const {error}=await supabase.from("projects").update({name:String(body.name).trim(),kind:body.kind||null,region:body.region||null,sale_price:price,commission_rate:Number(body.commission)||0}).eq("id",body.id);if(error)throw error;
      await supabase.from("documents").delete().eq("project_id",body.id).eq("document_type","PROJECT_DESCRIPTION");
      if(String(body.description||"").trim())await supabase.from("documents").insert({project_id:body.id,document_type:"PROJECT_DESCRIPTION",file_name:String(body.description).trim(),storage_path:"inline://description",mime_type:"text/plain"});
    }else return NextResponse.json({error:"Operação inválida."},{status:400});
    return NextResponse.json({ok:true});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Falha ao editar."},{status:500})}
}

export async function DELETE(request:Request){
  try{
    const body=await request.json();const supabase=supabaseAdmin();
    if(body.entity==="builder"){
      const {error}=await supabase.from("builders").update({active:false}).eq("id",body.id);if(error)throw error;
      await supabase.from("projects").update({active:false}).eq("builder_id",body.id);
    }else if(body.entity==="project"){
      const {error}=await supabase.from("projects").update({active:false}).eq("id",body.id);if(error)throw error;
    }else return NextResponse.json({error:"Operação inválida."},{status:400});
    return NextResponse.json({ok:true});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Falha ao excluir."},{status:500})}
}
