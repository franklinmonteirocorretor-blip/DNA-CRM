"use client";
import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { CrmNavigation } from "../components/crm-navigation";
import { CrmCenterTabs } from "../components/crm-center-tabs";
import "./ccas.css";

type Cca = {
  id: number;
  name: string;
  responsible_name: string;
  analysts: string[];
  analyst_contacts: AnalystContact[];
  phone: string;
  whatsapp: string;
  email?: string;
  region?: string;
  regions: string[];
  notes?: string;
  active: boolean;
};
type AnalystContact = { name: string; phone: string; whatsapp: string };
const regionOptions = ["Teresina", "Timon", "Altos", "Demerval", "MRV"];
const empty = {
  name: "",
  responsible_name: "",
  analyst_contacts: [{ name: "", phone: "", whatsapp: "" }],
  phone: "",
  whatsapp: "",
  email: "",
  regions: [] as string[],
  notes: "",
};

export default function CcasPage() {
  const [items, setItems] = useState<Cca[]>([]);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const load = () =>
    fetch("/api/ccas")
      .then(async (response) => ({
        ok: response.ok,
        data: await response.json(),
      }))
      .then(({ ok, data }) => {
        if (!ok) {
          setItems([]);
          setMessage(data.error || "Não foi possível carregar os CCAs.");
          return;
        }
        setItems(Array.isArray(data) ? data : []);
      });
  useEffect(() => {
    load();
  }, []);
  async function save(e: FormEvent) {
    e.preventDefault();
    setMessage("Salvando...");
    const r = await fetch("/api/ccas", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
    });
    const data = await r.json();
    if (!r.ok) {
      setMessage(data.error || "Não foi possível salvar.");
      return;
    }
    setForm(empty);
    setEditingId(null);
    setOpen(false);
    setMessage(
      editingId ? "CCA atualizado com sucesso." : "CCA cadastrado com sucesso.",
    );
    load();
  }
  async function toggle(item: Cca) {
    const response = await fetch("/api/ccas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, active: !item.active }),
    });
    if (!response.ok) {
      const data = await response.json();
      setMessage(data.error || "Não foi possível atualizar o CCA.");
      return;
    }
    load();
  }
  function edit(item: Cca) {
    setForm({
      name: item.name,
      responsible_name: item.responsible_name,
      analyst_contacts: item.analyst_contacts?.length
        ? item.analyst_contacts
        : [{ name: "", phone: "", whatsapp: "" }],
      phone: item.phone,
      whatsapp: item.whatsapp,
      email: item.email || "",
      regions: item.regions || [],
      notes: item.notes || "",
    });
    setEditingId(item.id);
    setOpen(true);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function remove(item: Cca) {
    if (!window.confirm(`Excluir o CCA ${item.name}?`)) return;
    const response = await fetch(`/api/ccas?id=${item.id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Não foi possível excluir o CCA.");
      return;
    }
    setMessage("CCA excluído com sucesso.");
    if (editingId === item.id) {
      setEditingId(null);
      setForm(empty);
      setOpen(false);
    }
    load();
  }
  return (
    <main className="cca-shell">
      <aside className="cca-sidebar">
        <div className="cca-brand">
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
        <div className="cca-user">
          <i>FM</i>
          <div>
            <b>Franklin Monteiro</b>
            <span>Corretor + Gestor</span>
          </div>
        </div>
      </aside>
      <section className="cca-main">
        <header className="cca-header">
          <div>
            <span>Parceiros de crédito imobiliário</span>
            <h1>Central de CCA</h1>
            <p>
              Cadastre responsáveis, contatos e canais usados para envio das
              análises.
            </p>
          </div>
        </header>
        <div className="cca-content">
          <CrmCenterTabs />
          <div className="crm-page-toolbar">
            <button
              onClick={() => {
                setEditingId(null);
                setForm(empty);
                setOpen((value) => !value);
              }}
            >
              ＋ Cadastrar CCA
            </button>
          </div>
          {message && <p className="cca-message">{message}</p>}
          {open && (
            <form className="cca-form" onSubmit={save}>
              <label>
                Nome do CCA
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Responsável
                <input
                  value={form.responsible_name}
                  onChange={(e) =>
                    setForm({ ...form, responsible_name: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                Telefone
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </label>
              <label>
                WhatsApp
                <input
                  value={form.whatsapp}
                  onChange={(e) =>
                    setForm({ ...form, whatsapp: e.target.value })
                  }
                />
              </label>
              <div className="wide cca-analysts">
                <span>Analistas</span>
                {form.analyst_contacts.map((analyst, index) => (
                  <div className="cca-analyst-row" key={index}>
                    <input
                      value={analyst.name}
                      placeholder={`Nome do analista ${index + 1}`}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          analyst_contacts: form.analyst_contacts.map(
                            (value, itemIndex) =>
                              itemIndex === index
                                ? { ...value, name: e.target.value }
                                : value,
                          ),
                        })
                      }
                    />
                    <input
                      value={analyst.phone}
                      placeholder="Telefone"
                      onChange={(e) =>
                        setForm({
                          ...form,
                          analyst_contacts: form.analyst_contacts.map(
                            (value, itemIndex) =>
                              itemIndex === index
                                ? { ...value, phone: e.target.value }
                                : value,
                          ),
                        })
                      }
                    />
                    <input
                      value={analyst.whatsapp}
                      placeholder="WhatsApp"
                      onChange={(e) =>
                        setForm({
                          ...form,
                          analyst_contacts: form.analyst_contacts.map(
                            (value, itemIndex) =>
                              itemIndex === index
                                ? { ...value, whatsapp: e.target.value }
                                : value,
                          ),
                        })
                      }
                    />
                    {form.analyst_contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            analyst_contacts: form.analyst_contacts.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          })
                        }
                      >
                        Remover
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      analyst_contacts: [
                        ...form.analyst_contacts,
                        { name: "", phone: "", whatsapp: "" },
                      ],
                    })
                  }
                >
                  + Adicionar analista
                </button>
              </div>
              <label>
                E-mail
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <fieldset className="wide cca-region-options">
                <legend>Regiões atendidas</legend>
                <div>
                  {regionOptions.map((region) => (
                    <label key={region}>
                      <input
                        type="checkbox"
                        checked={form.regions.includes(region)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            regions: e.target.checked
                              ? [...form.regions, region]
                              : form.regions.filter((item) => item !== region),
                          })
                        }
                      />
                      <span>{region}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="wide">
                Observações
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </label>
              <button type="submit">
                {editingId ? "Salvar alterações" : "Salvar CCA"}
              </button>
            </form>
          )}
          <section className="cca-list">
            <header>
              <div>
                <span>Correspondentes cadastrados</span>
                <h2>
                  {items.length} CCA{items.length === 1 ? "" : "s"}
                </h2>
              </div>
            </header>
            {!items.length && (
              <div className="cca-empty">
                <b>Nenhum CCA cadastrado</b>
                <span>
                  Cadastre o primeiro correspondente para habilitar o envio de
                  análises.
                </span>
              </div>
            )}
            {items.map((item) => (
              <article key={item.id} className={item.active ? "" : "inactive"}>
                <div>
                  <b>{item.name}</b>
                  <span>
                    {item.responsible_name} ·{" "}
                    {item.regions?.length
                      ? item.regions.join(" · ")
                      : item.region || "Região não informada"}
                  </span>
                  <small>{item.email || "E-mail não informado"}</small>
                  <div className="cca-analyst-contacts">
                    {item.analyst_contacts?.length ? (
                      item.analyst_contacts.map((analyst, index) => (
                        <div key={`${analyst.name}-${index}`}>
                          <b>{analyst.name}</b>
                          <a href={`tel:${analyst.phone}`}>
                            ☎ {analyst.phone || "Telefone não informado"}
                          </a>
                          {analyst.whatsapp && (
                            <a
                              className="whatsapp"
                              href={`https://wa.me/55${analyst.whatsapp.replace(/\D/g, "").replace(/^55/, "")}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              WhatsApp do analista
                            </a>
                          )}
                        </div>
                      ))
                    ) : (
                      <small>Nenhum analista informado</small>
                    )}
                  </div>
                </div>
                <div className="cca-contact">
                  <button onClick={() => edit(item)}>Editar</button>
                  <a href={`tel:${item.phone}`}>☎ Ligar</a>
                  <a
                    className="whatsapp"
                    href={`https://wa.me/55${item.whatsapp.replace(/\D/g, "").replace(/^55/, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Image
                      src="/whatsapp.svg"
                      alt="WhatsApp"
                      width={17}
                      height={17}
                    />{" "}
                    WhatsApp
                  </a>
                  <button onClick={() => toggle(item)}>
                    {item.active ? "Desativar" : "Ativar"}
                  </button>
                  <button onClick={() => remove(item)}>Excluir</button>
                </div>
              </article>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}
