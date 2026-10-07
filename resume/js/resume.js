/**
 * Client-side resume renderer for GitHub Pages.
 * Loads resume.json and builds the DOM with createElement (no innerHTML from data).
 * Display strings (dates, ages, durations, salary) are derived at render time.
 */
const DATA_URL = new URL("../resume.json", import.meta.url);

/**
 * @param {ParentNode} parent
 * @param {...(Node|string|null|undefined|false)} nodes
 */
function append(parent, ...nodes) {
  for (const node of nodes) {
    if (node == null || node === false) continue;
    parent.append(typeof node === "string" ? document.createTextNode(node) : node);
  }
}

/**
 * @param {string} tag
 * @param {Record<string, string>|null} [attrs]
 * @param {...(Node|string|null|undefined|false)} children
 */
function el(tag, attrs = null, ...children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value != null) node.setAttribute(key, value);
    }
  }
  append(node, ...children);
  return node;
}

/**
 * Parse **bold** markers into text + <strong> nodes.
 * @param {ParentNode} parent
 * @param {string} text
 */
function appendInline(parent, text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      parent.append(el("strong", null, part.slice(2, -2)));
    } else if (part) {
      parent.append(document.createTextNode(part));
    }
  }
}

/**
 * @param {string} url
 * @param {string} label
 * @param {{ blank?: boolean }} [opts]
 */
function link(url, label, { blank = true } = {}) {
  const attrs = { href: url };
  if (blank) {
    attrs.target = "_blank";
    attrs.rel = "noopener noreferrer";
  }
  return el("a", attrs, label);
}

/**
 * @param {ParentNode} parent
 * @param {string} text
 * @param {{ url: string, label: string }[]} links
 */
function appendLinkedText(parent, text, links) {
  /** @type {{ start: number, end: number, url: string, label: string }[]} */
  const ranges = [];
  for (const item of links) {
    const label = item?.label;
    const url = item?.url;
    if (!label || !url) continue;
    const start = text.indexOf(label);
    if (start === -1) continue;
    ranges.push({ start, end: start + label.length, url, label });
  }
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);

  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor) continue;
    if (range.start > cursor) {
      appendInline(parent, text.slice(cursor, range.start));
    }
    parent.append(link(range.url, range.label));
    cursor = range.end;
  }
  if (cursor < text.length) {
    appendInline(parent, text.slice(cursor));
  }
}

/**
 * @param {ParentNode} parent
 * @param {string | { text?: string, links?: { url: string, label: string }[] }} item
 */
function appendHighlight(parent, item) {
  if (typeof item === "string") {
    appendInline(parent, item);
    return;
  }
  const text = item?.text ?? "";
  const links = item?.links ?? [];
  if (!links.length) {
    appendInline(parent, text);
    return;
  }
  const sorted = [...links].sort(
    (a, b) => (b.label?.length ?? 0) - (a.label?.length ?? 0),
  );
  appendLinkedText(parent, text, sorted);
}

/**
 * @param {string|null|undefined} value YYYY, YYYY-MM, or YYYY-MM-DD
 * @returns {{ year: number, month: number, day: number }|null}
 */
function parseDateParts(value) {
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value ?? "");
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: match[2] ? Number(match[2]) - 1 : 0,
    day: match[3] ? Number(match[3]) : 1,
  };
}

/**
 * @param {{ year: number, month: number, day: number }} parts
 */
function toDate(parts) {
  return new Date(parts.year, parts.month, parts.day);
}

/**
 * @param {string} value
 * @param {string} lang
 */
function formatBirthDate(value, lang) {
  const parts = parseDateParts(value);
  if (!parts) return value ?? "";
  return new Intl.DateTimeFormat(lang, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(toDate(parts));
}

/**
 * @param {string} value YYYY or YYYY-MM
 * @param {string} lang
 */
function formatMonthYear(value, lang) {
  const parts = parseDateParts(value);
  if (!parts) return value ?? "";
  if (!/-/.test(value)) {
    return String(parts.year);
  }
  return new Intl.DateTimeFormat(lang, {
    year: "numeric",
    month: "long",
  }).format(toDate(parts));
}

/**
 * @param {string} isoDate YYYY-MM-DD
 * @returns {number|null}
 */
function ageFromBirthDate(isoDate) {
  const parts = parseDateParts(isoDate);
  if (!parts || !/-/.test(isoDate ?? "") || (isoDate?.length ?? 0) < 10) {
    return null;
  }
  const birth = toDate(parts);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Inclusive month span between YYYY-MM (or YYYY) values.
 * @param {string} start
 * @param {string|null|undefined} end null = now
 */
function monthsBetweenInclusive(start, end) {
  const startParts = parseDateParts(start);
  if (!startParts) return null;
  const endParts = end
    ? parseDateParts(end)
    : {
        year: new Date().getFullYear(),
        month: new Date().getMonth(),
        day: 1,
      };
  if (!endParts) return null;
  return (
    (endParts.year - startParts.year) * 12 +
    (endParts.month - startParts.month) +
    1
  );
}

/**
 * @param {number} totalMonths
 */
function formatDuration(totalMonths) {
  if (totalMonths == null || totalMonths < 1) return "";
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts = [];
  if (years > 0) parts.push(`${years} year${years === 1 ? "" : "s"}`);
  if (months > 0) parts.push(`${months} month${months === 1 ? "" : "s"}`);
  return parts.join(" ");
}

/**
 * @param {string} startDate
 * @param {string|null|undefined} endDate
 * @param {string} lang
 */
function formatWorkPeriod(startDate, endDate, lang) {
  const startLabel = formatMonthYear(startDate, lang);
  const endLabel = endDate ? formatMonthYear(endDate, lang) : "present";
  const duration = formatDuration(monthsBetweenInclusive(startDate, endDate));
  return duration
    ? `${startLabel} — ${endLabel} (${duration})`
    : `${startLabel} — ${endLabel}`;
}

/**
 * Whole years since the earliest work startDate.
 * @param {object[]} work
 */
function experienceYears(work) {
  let earliest = null;
  for (const job of work ?? []) {
    const parts = parseDateParts(job.startDate);
    if (!parts) continue;
    const key = parts.year * 12 + parts.month;
    if (earliest == null || key < earliest.key) {
      earliest = { key, parts };
    }
  }
  if (!earliest) return null;
  const now = new Date();
  const months =
    (now.getFullYear() - earliest.parts.year) * 12 +
    (now.getMonth() - earliest.parts.month);
  return Math.max(0, Math.floor(months / 12));
}

/**
 * @param {string} text
 * @param {Record<string, string|number|null|undefined>} vars
 */
function applyTemplate(text, vars) {
  return String(text).replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = vars[key];
    return value == null ? "" : String(value);
  });
}

/**
 * @param {string} url
 */
function urlLabel(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname.replace(/\/$/, "");
    if (host === "github.com" && path) {
      return `${host}${path}`;
    }
    return host;
  } catch {
    return url;
  }
}

/**
 * @param {string} url
 * @returns {string|null}
 */
function asUrl(url) {
  if (typeof url === "string" && url) return url;
  if (url && typeof url === "object" && url.url) return url.url;
  return null;
}

/**
 * @param {{ amount?: number, currency?: string, net?: boolean }} salary
 * @param {string} lang
 */
function formatSalary(salary, lang) {
  if (salary?.amount == null) return "";
  const currency = salary.currency || "RUB";
  const amount = new Intl.NumberFormat(lang, {
    maximumFractionDigits: 0,
  }).format(salary.amount);

  let money;
  if (currency === "RUB") {
    money = `${amount} ₽`;
  } else {
    money = new Intl.NumberFormat(lang, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(salary.amount);
  }
  return salary.net ? `${money} net` : money;
}

/**
 * @param {unknown[]} items
 */
function renderList(items) {
  const ul = el("ul");
  for (const item of items ?? []) {
    const li = el("li");
    appendHighlight(li, item);
    ul.append(li);
  }
  return ul;
}

/**
 * @param {object[]} jobs
 * @param {string} lang
 */
function renderWork(jobs, lang) {
  const fragment = document.createDocumentFragment();
  for (const job of jobs ?? []) {
    const location = el("div", { class: "job-location" }, `📍 ${job.location ?? ""}`);
    const website = asUrl(job.website);
    if (website) {
      append(location, " | 🌐 ", link(website, urlLabel(website)));
    }

    const description = el("div", { class: "job-description" });
    description.append(
      el("p", null, el("strong", null, `${job.sectionTitle || "Responsibilities"}:`)),
      renderList(job.highlights),
    );
    if (job.companyDescription) {
      const about = el("p");
      about.append(el("em", null, "About the company:"), ` ${job.companyDescription}`);
      description.append(about);
    }

    fragment.append(
      el(
        "div",
        { class: "job" },
        el(
          "div",
          { class: "job-header" },
          el("h3", null, job.company ?? ""),
          el("div", { class: "job-title" }, job.position ?? ""),
          el(
            "div",
            { class: "job-period" },
            formatWorkPeriod(job.startDate, job.endDate, lang),
          ),
          location,
        ),
        description,
      ),
    );
  }
  return fragment;
}

/**
 * @param {object[]} items
 */
function renderEducation(items) {
  const fragment = document.createDocumentFragment();
  for (const edu of items ?? []) {
    const metaParts = [edu.location, edu.endDate].filter(Boolean);
    fragment.append(
      el(
        "div",
        { class: "education" },
        el("h3", null, edu.institution ?? ""),
        metaParts.length
          ? el("p", null, el("em", null, metaParts.join(", ")))
          : null,
        el(
          "ul",
          null,
          el("li", null, el("strong", null, "Faculty:"), ` ${edu.faculty ?? ""}`),
          el("li", null, el("strong", null, "Major:"), ` ${edu.area ?? ""}`),
          el("li", null, el("strong", null, "Degree:"), ` ${edu.studyType ?? ""}`),
        ),
      ),
    );
  }
  return fragment;
}

/**
 * @param {object[]} skills
 */
function renderSkills(skills) {
  const grid = el("div", { class: "skills-grid" });
  for (const category of skills ?? []) {
    const ul = el("ul");
    for (const item of category.items ?? []) {
      ul.append(el("li", null, item));
    }
    grid.append(
      el("div", { class: "skill-category" }, el("h4", null, category.category ?? ""), ul),
    );
  }
  return grid;
}

/**
 * @param {string[]} qualities
 */
function renderQualities(qualities) {
  const wrap = el("div", { class: "qualities" });
  for (const quality of qualities ?? []) {
    wrap.append(el("span", { class: "quality-tag" }, quality));
  }
  return wrap;
}

/**
 * @param {object[]} languages
 */
function renderLanguages(languages) {
  const wrap = el("div", { class: "languages" });
  for (const lang of languages ?? []) {
    const box = el("div", { class: "language" }, el("strong", null, lang.language ?? ""));
    box.append(document.createTextNode(lang.fluency ?? ""));
    wrap.append(box);
  }
  return wrap;
}

/**
 * @param {HTMLElement} root
 * @param {object} data
 */
export function renderResume(root, data) {
  const meta = data.meta ?? {};
  const basics = data.basics ?? {};
  const contact = data.contact ?? {};
  const email = contact.email ?? {};
  const target = data.targetPosition ?? {};
  const salary = target.salary ?? {};
  const lang = meta.lang || "en";
  const years = experienceYears(data.work);

  document.documentElement.lang = lang;
  document.title = basics.name ? `Resume — ${basics.name}` : "Resume";

  const age = ageFromBirthDate(basics.birthDate);
  const birth = formatBirthDate(basics.birthDate, lang);
  const agePart = age != null ? ` (${age} years)` : "";

  const about = el("div", { class: "about" });
  const birthLine = el("p");
  birthLine.append(
    el("strong", null, "Date of birth:"),
    ` ${birth}${agePart}`,
    el("br"),
    el("strong", null, "Citizenship:"),
    ` ${basics.citizenship ?? ""}`,
  );
  about.append(birthLine);

  const summary = el("p");
  appendInline(
    summary,
    applyTemplate(basics.summary ?? "", { experienceYears: years }),
  );
  about.append(summary);

  const specialization = el("p");
  specialization.append(el("strong", null, "Specialization:"), " ");
  appendInline(specialization, basics.specialization ?? "");
  about.append(specialization);

  for (const highlight of basics.highlights ?? []) {
    const p = el("p");
    appendInline(p, applyTemplate(highlight, { experienceYears: years }));
    about.append(p);
  }

  const easterEgg =
    typeof basics.easterEgg === "string"
      ? basics.easterEgg
      : basics.easterEgg?.command;
  if (easterEgg) {
    about.append(el("pre", null, el("code", null, easterEgg)));
  }

  const emailLine = el("li");
  emailLine.append(
    el("strong", null, "Email:"),
    " ",
    link(`mailto:${email.address ?? ""}`, email.address ?? "", { blank: false }),
  );
  if (email.preferred) {
    emailLine.append(" ", el("em", null, "(preferred contact method)"));
  }

  const githubUrl = asUrl(contact.github);
  const roles = (target.roles ?? []).join(", ");
  const salaryText = formatSalary(salary, lang);

  root.replaceChildren(
    el("h1", null, basics.name ?? ""),
    el("p", null, el("strong", null, basics.label ?? "")),
    el(
      "nav",
      { class: "toc", "aria-label": "Table of contents" },
      el("h2", null, "Table of contents"),
      el(
        "ul",
        null,
        el("li", null, el("a", { href: "#contacts" }, "Contact information")),
        el("li", null, el("a", { href: "#about" }, "About")),
        el("li", null, el("a", { href: "#experience" }, "Work experience")),
        el("li", null, el("a", { href: "#education" }, "Education")),
        el("li", null, el("a", { href: "#skills" }, "Technical skills")),
        el("li", null, el("a", { href: "#qualities" }, "Personal qualities")),
        el("li", null, el("a", { href: "#languages" }, "Languages")),
        el("li", null, el("a", { href: "#position" }, "Desired position")),
      ),
    ),
    el("hr"),
    el("h2", { id: "contacts" }, "👤 Contact information"),
    el(
      "div",
      { class: "contact-info" },
      el(
        "ul",
        null,
        el("li", null, el("strong", null, "Phone:"), ` ${contact.phone ?? ""}`),
        emailLine,
        githubUrl
          ? el(
              "li",
              null,
              el("strong", null, "GitHub:"),
              " ",
              link(githubUrl, urlLabel(githubUrl)),
            )
          : null,
        el("li", null, el("strong", null, "Location:"), ` ${contact.location ?? ""}`),
      ),
    ),
    el("h2", { id: "about" }, "💼 About"),
    about,
    el("h2", { id: "experience" }, "🚀 Work experience"),
    renderWork(data.work, lang),
    el("h2", { id: "education" }, "🎓 Education"),
    renderEducation(data.education),
    el("h2", { id: "skills" }, "🛠️ Technical skills"),
    renderSkills(data.skills),
    el("h2", { id: "qualities" }, "💪 Personal qualities"),
    renderQualities(data.qualities),
    el("h2", { id: "languages" }, "🌐 Languages"),
    renderLanguages(data.languages),
    el("h2", { id: "position" }, "💰 Desired position"),
    el(
      "div",
      { class: "position-info" },
      el(
        "ul",
        null,
        el("li", null, el("strong", null, "Title:"), ` ${target.title ?? ""}`),
        el("li", null, el("strong", null, "Work format:"), ` ${target.workFormat ?? ""}`),
        el("li", null, el("strong", null, "Related roles:"), ` ${roles}`),
        salaryText
          ? el("li", null, el("strong", null, "Salary:"), ` ${salaryText}`)
          : null,
      ),
    ),
  );
}

/**
 * @param {HTMLElement} root
 * @param {unknown} error
 */
function showError(root, error) {
  const message = error instanceof Error ? error.message : String(error);
  root.replaceChildren(
    el(
      "p",
      { class: "resume-status resume-status--error", role: "alert" },
      "Failed to load the resume. ",
      el("br"),
      el("code", null, message),
    ),
  );
}

async function main() {
  const root = document.getElementById("resume-root");
  if (!root) {
    console.error("Missing #resume-root");
    return;
  }

  root.replaceChildren(el("p", { class: "resume-status" }, "Loading resume…"));

  try {
    const response = await fetch(DATA_URL, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while loading ${DATA_URL.pathname}`);
    }
    const data = await response.json();
    renderResume(root, data);
    root.setAttribute("aria-busy", "false");
  } catch (error) {
    console.error(error);
    showError(root, error);
    root.setAttribute("aria-busy", "false");
  }
}

main();
