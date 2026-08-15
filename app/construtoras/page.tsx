"use client";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CrmNavigation } from "../components/crm-navigation";
import "./construtoras.css";
import "./management.css";

type Media = { id: number; name: string; type: string; url: string };
type Project = {
  id: number;
  name: string;
  kind: string;
  region: string;
  price: number;
  commission: number;
  description: string;
  media: Media[];
};
type Builder = {
  id: number;
  name: string;
  category: string;
  contact: string;
  phone: string;
  regions: string[];
  projects: Project[];
};
const emptyBuilder = {
  name: "",
  category: "Mista",
  contact: "",
  phone: "",
  regions: [] as string[],
};
const emptyProject = {
  name: "",
  kind: "",
  region: "",
  price: "",
  commission: "6",
  description: "",
};
const regionOptions = [
  "Teresina Leste",
  "Teresina Norte",
  "Teresina Sul",
  "Teresina Sudeste",
  "Timon",
  "Altos",
  "Demerval Lobão",
];
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function Construtoras() {
  const [catalog, setCatalog] = useState<Builder[]>([]);
  const [builderId, setBuilderId] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [mode, setMode] = useState<
    "" | "new-builder" | "edit-builder" | "new-project" | "edit-project"
  >("");
  const [builderForm, setBuilderForm] = useState(emptyBuilder);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const builder = catalog.find((item) => item.id === builderId) || catalog[0];
  const project =
    builder?.projects.find((item) => item.id === projectId) ||
    builder?.projects[0];
  const load = async (preferredBuilder?: number, preferredProject?: number) => {
    const response = await fetch("/api/catalog", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Falha ao carregar catálogo.");
      return;
    }
    setCatalog(data);
    const nextBuilder =
      data.find(
        (item: Builder) => item.id === (preferredBuilder || builderId),
      ) || data[0];
    const nextProject =
      nextBuilder?.projects.find(
        (item: Project) => item.id === (preferredProject || projectId),
      ) || nextBuilder?.projects[0];
    setBuilderId(nextBuilder?.id || null);
    setProjectId(nextProject?.id || null);
  };
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const regions = useMemo(
    () => [
      ...new Set(
        catalog
          .flatMap((item) => item.projects.map((entry) => entry.region))
          .filter(Boolean),
      ),
    ],
    [catalog],
  );
  const openBuilder = (edit = false) => {
    setBuilderForm(
      edit && builder
        ? {
            name: builder.name,
            category: builder.category,
            contact: builder.contact,
            phone: builder.phone,
            regions: builder.regions,
          }
        : emptyBuilder,
    );
    setMode(edit ? "edit-builder" : "new-builder");
    setMessage("");
  };
  const openProject = (edit = false) => {
    setProjectForm(
      edit && project
        ? {
            name: project.name,
            kind: project.kind,
            region: project.region,
            price: String(project.price),
            commission: String(project.commission),
            description: project.description,
          }
        : emptyProject,
    );
    setMode(edit ? "edit-project" : "new-project");
    setMessage("");
  };
  const saveBuilder = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const editing = mode === "edit-builder";
    const response = await fetch("/api/catalog", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "builder",
        id: builder?.id,
        ...builderForm,
      }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error);
      return;
    }
    setMode("");
    setMessage(
      editing
        ? "Construtora atualizada."
        : "Construtora cadastrada. Agora cadastre seus empreendimentos.",
    );
    await load(editing ? builder?.id : data.id);
  };
  const saveProject = async (event: FormEvent) => {
    event.preventDefault();
    if (!builder) return;
    setBusy(true);
    const editing = mode === "edit-project";
    const response = await fetch("/api/catalog", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entity: "project",
        id: project?.id,
        builderId: builder.id,
        ...projectForm,
      }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error);
      return;
    }
    setMode("");
    setMessage(
      editing ? "Empreendimento atualizado." : "Empreendimento cadastrado.",
    );
    await load(builder.id, editing ? project?.id : data.id);
  };
  const remove = async (entity: "builder" | "project") => {
    const target = entity === "builder" ? builder : project;
    if (
      !target ||
      !window.confirm(
        `Excluir ${target.name}? O item será removido do catálogo ativo.`,
      )
    )
      return;
    setBusy(true);
    const response = await fetch("/api/catalog", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity, id: target.id }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error);
      return;
    }
    setMessage(
      entity === "builder"
        ? "Construtora excluída."
        : "Empreendimento excluído.",
    );
    setBuilderId(null);
    setProjectId(null);
    await load();
  };
  const uploadMedia = async (files: FileList | null) => {
    if (!project || !files?.length) return;
    if (project.media.length + files.length > 10) {
      setMessage("Máximo de 10 mídias por empreendimento.");
      return;
    }
    setBusy(true);
    for (const file of Array.from(files)) {
      const prepareResponse = await fetch("/api/catalog/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prepare",
          projectId: project.id,
          name: file.name,
          type: file.type,
        }),
      });
      const prepared = await prepareResponse.json();
      if (!prepareResponse.ok) {
        setMessage(`${file.name}: ${prepared.error}`);
        setBusy(false);
        return;
      }
      const uploadForm = new FormData();
      uploadForm.append("cacheControl", "3600");
      uploadForm.append("", file);
      const uploadResponse = await fetch(prepared.signedUrl, {
        method: "PUT",
        headers: { "x-upsert": "false" },
        body: uploadForm,
      });
      if (!uploadResponse.ok) {
        setMessage(`${file.name}: falha no envio ao armazenamento.`);
        setBusy(false);
        return;
      }
      const completeResponse = await fetch("/api/catalog/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          projectId: project.id,
          name: file.name,
          type: file.type,
          path: prepared.path,
        }),
      });
      const completed = await completeResponse.json();
      if (!completeResponse.ok) {
        setMessage(`${file.name}: ${completed.error}`);
        setBusy(false);
        return;
      }
    }
    setMessage("Mídias anexadas.");
    setBusy(false);
    await load(builder?.id, project.id);
  };
  const removeMedia = async (id: number) => {
    if (!window.confirm("Excluir esta mídia?")) return;
    setBusy(true);
    const response = await fetch("/api/catalog/media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error);
      return;
    }
    await load(builder?.id, project?.id);
  };
  const phoneDigits = builder?.phone.replace(/\D/g, "") || "";
  const whatsappDigits = phoneDigits.startsWith("55")
    ? phoneDigits
    : `55${phoneDigits}`;
  return (
    <main className="builder-shell">
      <aside className="builder-sidebar">
        <div className="builder-brand">
          <Image
            src="/monteiro-logo.png"
            alt="Monteiro CRM"
            width={58}
            height={64}
          />
          <b>MONTEIRO</b>
          <span>CRM</span>
        </div>
        <CrmNavigation />
        <div className="builder-user">
          <i>FM</i>
          <div>
            <b>Franklin Monteiro</b>
            <span>Corretor + Gestor</span>
          </div>
        </div>
      </aside>
      <section className="builder-main">
        <header className="builder-header">
          <div>
            <span>Catálogo comercial</span>
            <h1>Construtoras e Empreendimentos</h1>
            <p>Construtora primeiro. Depois, somente seus empreendimentos.</p>
          </div>
          <button onClick={() => openBuilder(false)}>
            ＋ Cadastrar construtora
          </button>
        </header>
        <div className="builder-content">
          {message && <div className="catalog-message">{message}</div>}
          <section className="builder-kpis compact">
            <article>
              <span>Construtoras parceiras</span>
              <strong>{catalog.length}</strong>
              <small>Cadastros ativos</small>
            </article>
            <article>
              <span>Empreendimentos ativos</span>
              <strong>
                {catalog.reduce((sum, item) => sum + item.projects.length, 0)}
              </strong>
              <small>Produtos cadastrados</small>
            </article>
            <article>
              <span>Regiões atendidas</span>
              <strong>{regions.length}</strong>
              <small>Regiões distintas</small>
            </article>
          </section>
          {(mode === "new-builder" || mode === "edit-builder") && (
            <form className="catalog-form" onSubmit={saveBuilder}>
              <header>
                <div>
                  <span>Construtora</span>
                  <h2>
                    {mode === "edit-builder"
                      ? "Editar construtora"
                      : "Nova construtora"}
                  </h2>
                </div>
                <button type="button" onClick={() => setMode("")}>
                  ×
                </button>
              </header>
              <div>
                <label>
                  <span>Nome</span>
                  <input
                    required
                    value={builderForm.name}
                    onChange={(e) =>
                      setBuilderForm({ ...builderForm, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Classificação</span>
                  <select
                    value={builderForm.category}
                    onChange={(e) =>
                      setBuilderForm({
                        ...builderForm,
                        category: e.target.value,
                      })
                    }
                  >
                    <option>Construtora de casas residenciais</option>
                    <option>Construtora de empreendimentos</option>
                    <option>Mista</option>
                  </select>
                </label>
                <label>
                  <span>Responsável comercial</span>
                  <input
                    required
                    value={builderForm.contact}
                    onChange={(e) =>
                      setBuilderForm({
                        ...builderForm,
                        contact: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  <span>Telefone / WhatsApp</span>
                  <input
                    required
                    value={builderForm.phone}
                    onChange={(e) =>
                      setBuilderForm({ ...builderForm, phone: e.target.value })
                    }
                  />
                </label>
                <fieldset className="wide region-options">
                  <legend>Regiões atendidas</legend>
                  <div>
                    {[...new Set([...regionOptions, ...builderForm.regions])].map(
                      (region) => (
                        <label key={region}>
                          <input
                            type="checkbox"
                            checked={builderForm.regions.includes(region)}
                            onChange={(e) =>
                              setBuilderForm({
                                ...builderForm,
                                regions: e.target.checked
                                  ? [...builderForm.regions, region]
                                  : builderForm.regions.filter(
                                      (item) => item !== region,
                                    ),
                              })
                            }
                          />
                          <span>{region}</span>
                        </label>
                      ),
                    )}
                  </div>
                </fieldset>
              </div>
              <footer>
                <button disabled={busy}>Salvar construtora</button>
              </footer>
            </form>
          )}
          {(mode === "new-project" || mode === "edit-project") && builder && (
            <form className="catalog-form" onSubmit={saveProject}>
              <header>
                <div>
                  <span>{builder.name} → Empreendimento</span>
                  <h2>
                    {mode === "edit-project"
                      ? "Editar empreendimento"
                      : "Novo empreendimento"}
                  </h2>
                </div>
                <button type="button" onClick={() => setMode("")}>
                  ×
                </button>
              </header>
              <div>
                <label>
                  <span>Nome</span>
                  <input
                    required
                    value={projectForm.name}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Tipo</span>
                  <input
                    value={projectForm.kind}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, kind: e.target.value })
                    }
                    placeholder="Condomínio de casas"
                  />
                </label>
                <label>
                  <span>Região</span>
                  <input
                    value={projectForm.region}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, region: e.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Valor de venda atual</span>
                  <input
                    required
                    inputMode="decimal"
                    value={projectForm.price}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        price: e.target.value
                          .replace(/[^0-9.,]/g, "")
                          .replace(/\./g, "")
                          .replace(",", "."),
                      })
                    }
                  />
                </label>
                <label>
                  <span>Comissão negociada (%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={projectForm.commission}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        commission: e.target.value,
                      })
                    }
                  />
                </label>
                <label className="wide">
                  <span>Descrição personalizada do empreendimento</span>
                  <textarea
                    value={projectForm.description}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Estrutura, diferenciais, localização, condições e informações comerciais..."
                  />
                </label>
              </div>
              <footer>
                <button disabled={busy}>Salvar empreendimento</button>
              </footer>
            </form>
          )}
          <div className="builder-workspace">
            <section className="builder-list">
              <header>
                <div>
                  <span>Construtoras</span>
                  <h2>Selecione a construtora</h2>
                </div>
              </header>
              {catalog.map((item) => (
                <button
                  className={builder?.id === item.id ? "selected" : ""}
                  onClick={() => {
                    setBuilderId(item.id);
                    setProjectId(item.projects[0]?.id || null);
                    setMode("");
                  }}
                  key={item.id}
                >
                  <i>{item.name.slice(0, 2).toUpperCase()}</i>
                  <div>
                    <b>{item.name}</b>
                    <span>{item.category}</span>
                    <small>{item.projects.length} empreendimento(s)</small>
                  </div>
                </button>
              ))}
            </section>
            <section className="builder-detail">
              {builder ? (
                <>
                  <header>
                    <div>
                      <span>Construtora selecionada</span>
                      <h2>{builder.name}</h2>
                      <p>
                        {builder.category} · {builder.regions.join(" · ")}
                      </p>
                    </div>
                    <div className="entity-actions">
                      <button onClick={() => openBuilder(true)}>Editar</button>
                      <button
                        className="danger"
                        onClick={() => remove("builder")}
                      >
                        Excluir
                      </button>
                    </div>
                  </header>
                  <section className="builder-contact">
                    <article>
                      <span>Responsável comercial</span>
                      <b>{builder.contact || "Não informado"}</b>
                    </article>
                    <article>
                      <span>Telefone</span>
                      <b>{builder.phone || "Não informado"}</b>
                    </article>
                    <div className="contact-direct">
                      <a href={`tel:${phoneDigits}`}>☎ Ligar</a>
                      <a
                        className="whatsapp"
                        target="_blank"
                        href={`https://wa.me/${whatsappDigits}`}
                      >
                        <Image
                          src="/whatsapp.svg"
                          alt="WhatsApp"
                          width={15}
                          height={15}
                        />{" "}
                        WhatsApp
                      </a>
                    </div>
                  </section>
                  <div className="hierarchy">
                    <b>{builder.name}</b>
                    <span>›</span>
                    <strong>
                      {project?.name || "Cadastre o primeiro empreendimento"}
                    </strong>
                  </div>
                  <div className="project-tabs">
                    {builder.projects.map((item) => (
                      <button
                        className={project?.id === item.id ? "active" : ""}
                        onClick={() => {
                          setProjectId(item.id);
                          setMode("");
                        }}
                        key={item.id}
                      >
                        <b>{item.name}</b>
                        <small>
                          {item.kind} · {item.region}
                        </small>
                      </button>
                    ))}
                    <button
                      className="add-project"
                      onClick={() => openProject(false)}
                    >
                      ＋ Empreendimento
                    </button>
                  </div>
                  {project ? (
                    <>
                      <section className="project-summary clean">
                        <article>
                          <span>Valor de venda atual</span>
                          <strong>{money.format(project.price)}</strong>
                          <small>Editável no cadastro</small>
                        </article>
                        <article>
                          <span>Comissão negociada</span>
                          <strong>{project.commission}%</strong>
                          <small>Aplicada no VGV</small>
                        </article>
                        <article>
                          <span>Região</span>
                          <strong>{project.region || "Não informada"}</strong>
                          <small>Direcionamento comercial</small>
                        </article>
                      </section>
                      <section className="project-description">
                        <header>
                          <span>Descrição do empreendimento</span>
                          <div className="entity-actions">
                            <button onClick={() => openProject(true)}>
                              Editar
                            </button>
                            <button
                              className="danger"
                              onClick={() => remove("project")}
                            >
                              Excluir
                            </button>
                          </div>
                        </header>
                        <p>
                          {project.description ||
                            "Nenhuma descrição cadastrada."}
                        </p>
                      </section>
                      <section className="media-manager">
                        <header>
                          <div>
                            <span>Fotos e vídeos</span>
                            <h2>Galeria do empreendimento</h2>
                            <small>
                              {project.media.length}/10 mídias anexadas
                            </small>
                          </div>
                          <label
                            className={
                              project.media.length >= 10 ? "disabled" : ""
                            }
                          >
                            ＋ Anexar mídias
                            <input
                              type="file"
                              multiple
                              accept="image/*,video/*"
                              disabled={busy || project.media.length >= 10}
                              onChange={(e) => void uploadMedia(e.target.files)}
                            />
                          </label>
                        </header>
                        <div>
                          {project.media.map((item, index) => (
                            <article key={item.id}>
                              {item.type.startsWith("image/") ? (
                                <img src={item.url} alt={item.name} />
                              ) : (
                                <video
                                  src={item.url}
                                  controls
                                  preload="metadata"
                                />
                              )}
                              <footer>
                                <span>
                                  <b>{String(index + 1).padStart(2, "0")}</b>
                                  <small>{item.name}</small>
                                </span>
                                <button onClick={() => removeMedia(item.id)}>
                                  Excluir
                                </button>
                              </footer>
                            </article>
                          ))}
                          {!project.media.length && (
                            <div className="media-empty">
                              Nenhuma mídia anexada. Use “Anexar mídias”.
                            </div>
                          )}
                        </div>
                      </section>
                    </>
                  ) : (
                    <div className="project-empty">
                      Cadastre o primeiro empreendimento desta construtora.
                    </div>
                  )}
                </>
              ) : (
                <div className="project-empty">
                  Nenhuma construtora cadastrada.
                </div>
              )}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
