"use client";
import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CrmNavigation } from "../components/crm-navigation";
import { CrmCenterTabs } from "../components/crm-center-tabs";
import { CATALOG_CITIES, normalizeCatalogCity } from "@/lib/catalog-hierarchy";
import "./construtoras.css";
import "./management.css";
import "./editing.css";

type Media = { id: number; name: string; type: string; url: string };
type Project = {
  id: number;
  name: string;
  kind: string;
  city: string;
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
  kind: "Casas",
  city: "Teresina",
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
const formatPriceInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(digits) / 100);
};
const priceToInput = (value: number) =>
  formatPriceInput(String(Math.round(value * 100)));
const parsePriceInput = (value: string) =>
  Number(value.replace(/\D/g, "")) / 100;
const normalizeProjectKind = (value: string) =>
  value.toLocaleLowerCase("pt-BR").includes("apart") ? "Apartamentos" : "Casas";

export default function Construtoras() {
  const [catalog, setCatalog] = useState<Builder[]>([]);
  const [builderId, setBuilderId] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [selectedCity, setSelectedCity] = useState("Teresina");
  const [mode, setMode] = useState<
    "" | "new-builder" | "edit-builder" | "new-project" | "edit-project"
  >("");
  const [builderForm, setBuilderForm] = useState(emptyBuilder);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const cityBuilders = catalog.filter(
    (item) =>
      !item.projects.length ||
      item.projects.some(
        (entry) =>
          normalizeCatalogCity(entry.city, entry.region) === selectedCity,
      ),
  );
  const builder =
    cityBuilders.find((item) => item.id === builderId) || cityBuilders[0];
  const cityProjects =
    builder?.projects.filter(
      (item) => normalizeCatalogCity(item.city, item.region) === selectedCity,
    ) || [];
  const project =
    cityProjects.find((item) => item.id === projectId) || cityProjects[0];
  const load = async (preferredBuilder?: number, preferredProject?: number) => {
    const response = await fetch("/api/catalog", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Falha ao carregar catálogo.");
      return;
    }
    setCatalog(data);
    const preferredCity = data
      .flatMap((item: Builder) => item.projects)
      .find((item: Project) => item.id === preferredProject)?.city;
    const nextCity = preferredCity
      ? normalizeCatalogCity(preferredCity)
      : selectedCity;
    setSelectedCity(nextCity);
    const eligibleBuilders = data.filter(
      (item: Builder) =>
        !item.projects.length ||
        item.projects.some(
          (entry) =>
            normalizeCatalogCity(entry.city, entry.region) === nextCity,
        ),
    );
    const nextBuilder =
      eligibleBuilders.find(
        (item: Builder) => item.id === (preferredBuilder || builderId),
      ) || eligibleBuilders[0];
    const nextProject =
      nextBuilder?.projects.find(
        (item: Project) =>
          normalizeCatalogCity(item.city, item.region) === nextCity &&
          item.id === (preferredProject || projectId),
      ) ||
      nextBuilder?.projects.find(
        (item: Project) =>
          normalizeCatalogCity(item.city, item.region) === nextCity,
      );
    setBuilderId(nextBuilder?.id || null);
    setProjectId(nextProject?.id || null);
  };
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // Initial catalog load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const cities = useMemo(
    () => [
      ...new Set(
        catalog
          .flatMap((item) =>
            item.projects.map((entry) =>
              normalizeCatalogCity(entry.city, entry.region),
            ),
          )
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
            kind: normalizeProjectKind(project.kind),
            city: normalizeCatalogCity(project.city, project.region),
            region: project.region,
            price: priceToInput(project.price),
            commission: String(project.commission),
            description: project.description,
          }
        : { ...emptyProject, city: selectedCity },
    );
    setMode(edit ? "edit-project" : "new-project");
    setMessage("");
  };
  const saveBuilder = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const editing = mode === "edit-builder";
    try {
      const response = await fetch("/api/catalog", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "builder",
          id: builder?.id,
          ...builderForm,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error || "Falha ao salvar a construtora.");
        return;
      }
      setMode("");
      setMessage(
        data.reactivated
          ? "Construtora reativada e atualizada."
          : editing
            ? "Construtora atualizada."
            : "Construtora cadastrada. Agora cadastre seus empreendimentos.",
      );
      await load(editing ? builder?.id : data.id);
    } catch {
      setMessage("Não foi possível salvar a construtora. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };
  const saveProject = async (event: FormEvent) => {
    event.preventDefault();
    if (!builder || busy) return;
    setBusy(true);
    const editing = mode === "edit-project";
    try {
      const response = await fetch("/api/catalog", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity: "project",
          id: project?.id,
          builderId: builder.id,
          ...projectForm,
          price: parsePriceInput(projectForm.price),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error || "Falha ao salvar o empreendimento.");
        return;
      }
      setMode("");
      setMessage(
        data.reactivated
          ? "Empreendimento reativado e atualizado."
          : editing
            ? "Empreendimento atualizado."
            : "Empreendimento cadastrado.",
      );
      await load(builder.id, editing ? project?.id : data.id);
    } catch {
      setMessage("Não foi possível salvar o empreendimento. Tente novamente.");
    } finally {
      setBusy(false);
    }
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
            <p>Cidade primeiro. Depois, construtora e empreendimento.</p>
          </div>
        </header>
        <div className="builder-content">
          <CrmCenterTabs />
          <div className="crm-page-toolbar">
            <button onClick={() => openBuilder(false)}>
              ＋ Cadastrar construtora
            </button>
          </div>
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
              <strong>{cities.length}</strong>
              <small>Regiões distintas</small>
            </article>
          </section>
          <section className="catalog-city-strip">
            <header>
              <span>01 · Cidade</span>
              <b>Localize construtoras e empreendimentos</b>
            </header>
            <div>
              {CATALOG_CITIES.map((city) => (
                <button
                  type="button"
                  key={city}
                  className={selectedCity === city ? "active" : ""}
                  onClick={() => {
                    setSelectedCity(city);
                    const nextBuilder = catalog.find(
                      (item) =>
                        !item.projects.length ||
                        item.projects.some(
                          (entry) =>
                            normalizeCatalogCity(entry.city, entry.region) ===
                            city,
                        ),
                    );
                    setBuilderId(nextBuilder?.id || null);
                    setProjectId(
                      nextBuilder?.projects.find(
                        (entry) =>
                          normalizeCatalogCity(entry.city, entry.region) ===
                          city,
                      )?.id || null,
                    );
                    setMode("");
                  }}
                >
                  {city}
                </button>
              ))}
            </div>
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
                    {[
                      ...new Set([...regionOptions, ...builderForm.regions]),
                    ].map((region) => (
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
                    ))}
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
                  <span>
                    {selectedCity} → {builder.name} → Empreendimento
                  </span>
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
                  <select
                    value={projectForm.kind}
                    onChange={(e) =>
                      setProjectForm({ ...projectForm, kind: e.target.value })
                    }
                  >
                    <option value="Casas">Casas</option>
                    <option value="Apartamentos">Apartamentos</option>
                  </select>
                </label>
                <label>
                  <span>Região</span>
                  <div className="project-region-grid">
                    {regionOptions.map((region) => {
                      const selected = projectForm.region
                        .split(",")
                        .map((value) => value.trim())
                        .filter(Boolean);
                      return (
                        <label key={region}>
                          <input
                            type="checkbox"
                            checked={selected.includes(region)}
                            onChange={(event) =>
                              setProjectForm({
                                ...projectForm,
                                region: (event.target.checked
                                  ? [...selected, region]
                                  : selected.filter((value) => value !== region)
                                ).join(", "),
                              })
                            }
                          />
                          <span>{region}</span>
                        </label>
                      );
                    })}
                  </div>
                </label>
                <label>
                  <span>Valor de venda atual</span>
                  <input
                    required
                    inputMode="numeric"
                    value={projectForm.price}
                    onChange={(e) =>
                      setProjectForm({
                        ...projectForm,
                        price: formatPriceInput(e.target.value),
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
              {cityBuilders.map((item) => (
                <button
                  className={builder?.id === item.id ? "selected" : ""}
                  onClick={() => {
                    setBuilderId(item.id);
                    setProjectId(
                      item.projects.find(
                        (entry) =>
                          normalizeCatalogCity(entry.city, entry.region) ===
                          selectedCity,
                      )?.id || null,
                    );
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
                    <b>{selectedCity}</b>
                    <span>›</span>
                    <b>{builder.name}</b>
                    <span>›</span>
                    <strong>
                      {project?.name || "Cadastre o primeiro empreendimento"}
                    </strong>
                  </div>
                  <div className="project-tabs">
                    {cityProjects.map((item) => (
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
                                <Image
                                  src={item.url}
                                  alt={item.name}
                                  width={420}
                                  height={250}
                                  unoptimized
                                />
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
