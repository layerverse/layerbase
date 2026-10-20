const STORAGE_KEY = "layerbase-prototype-v1";

const sampleData = {
  collections: [
    {
      id: "col-inspiration",
      name: "Inspiration",
      description: "Ideas, references and things worth keeping.",
      createdAt: "2026-10-15T09:00:00.000Z"
    },
    {
      id: "col-layerverse",
      name: "Layerverse",
      description: "Worldbuilding, visual references and concepts.",
      createdAt: "2026-10-16T09:00:00.000Z"
    },
    {
      id: "col-reading",
      name: "Reading list",
      description: "Articles and sites to explore later.",
      createdAt: "2026-10-17T09:00:00.000Z"
    }
  ],
  items: [
    {
      id: "item-1",
      type: "bookmark",
      title: "Are.na — Collecting ideas",
      url: "https://www.are.na/",
      image: "",
      content: "A place to collect references and connect ideas through visual channels.",
      tags: ["inspiration", "research"],
      collectionIds: ["col-inspiration"],
      createdAt: "2026-10-18T09:30:00.000Z",
      updatedAt: "2026-10-18T09:30:00.000Z"
    },
    {
      id: "item-2",
      type: "note",
      title: "A city suspended between layers",
      url: "",
      image: "",
      content: "Buildings float at different heights, connected by translucent bridges. At night, soft cyan lights travel through the architecture like rivers.",
      tags: ["Layerverse", "worldbuilding"],
      collectionIds: ["col-layerverse"],
      createdAt: "2026-10-18T12:20:00.000Z",
      updatedAt: "2026-10-18T12:20:00.000Z"
    },
    {
      id: "item-3",
      type: "note",
      title: "Small interface ideas",
      url: "",
      image: "",
      content: "Keep the interface calm. Let the content provide the color. Views should change how information is seen, not create new copies of it.",
      tags: ["design", "ideas"],
      collectionIds: ["col-inspiration"],
      createdAt: "2026-10-17T15:45:00.000Z",
      updatedAt: "2026-10-17T15:45:00.000Z"
    },
    {
      id: "item-4",
      type: "bookmark",
      title: "The creative potential of personal knowledge",
      url: "https://www.are.na/",
      image: "",
      content: "A reference for thinking about how collected material can become a personal creative environment.",
      tags: ["research", "knowledge"],
      collectionIds: ["col-reading", "col-inspiration"],
      createdAt: "2026-10-16T10:15:00.000Z",
      updatedAt: "2026-10-16T10:15:00.000Z"
    },
    {
      id: "item-5",
      type: "image",
      title: "Soft futuristic architecture",
      url: "",
      image: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1000&q=80",
      content: "A visual reference for quiet, futuristic architectural forms.",
      tags: ["architecture", "visual"],
      collectionIds: ["col-layerverse", "col-inspiration"],
      createdAt: "2026-10-15T14:00:00.000Z",
      updatedAt: "2026-10-15T14:00:00.000Z"
    },
    {
      id: "item-6",
      type: "note",
      title: "One item, many contexts",
      url: "",
      image: "",
      content: "An item should have one identity, even when it appears in several collections. A collection organizes references to items rather than owning separate copies.",
      tags: ["architecture", "ideas"],
      collectionIds: ["col-inspiration", "col-layerverse"],
      createdAt: "2026-10-14T11:10:00.000Z",
      updatedAt: "2026-10-14T11:10:00.000Z"
    }
  ]
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed.items) &&
          Array.isArray(parsed.collections)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("Could not load saved data:", error);
  }

  return structuredClone(sampleData);
}

const state = {
  ...loadData(),
  page: "home",
  activeCollectionId: null,
  layout: "grid",
  cardStyle: localStorage.getItem("layerbase-card-style") === "mono" ? "mono" : "soft",
  query: "",
  editingItemId: null
};

const $ = (selector) => document.querySelector(selector);

const pageContent = $("#pageContent");
const sidebarCollections = $("#sidebarCollections");
const modalBackdrop = $("#modalBackdrop");
const itemForm = $("#itemForm");
const collectionForm = $("#collectionForm");

const typeNames = {
  note: "Note",
  bookmark: "Bookmark",
  image: "Image"
};

const typeSymbols = {
  note: "sticky-note",
  bookmark: "link-2",
  image: "image"
};

function iconMarkup(name, className = "") {
  return `<i data-lucide="${name}" class="${className}"></i>`;
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      items: state.items,
      collections: state.collections
    }));
  } catch (error) {
    console.error("Could not save data:", error);
    showToast("Could not save. Check browser storage.");
  }
}

function uid(prefix = "item") {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36).slice(2, 8)}`;
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function safeUrl(value = "") {
  try {
    const url = new URL(value);

    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.href;
    }
  } catch (_) {}

  return "";
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function formatTime(value) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function dateKey(value) {
  const d = new Date(value);

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}

function dayLabel(value) {
  const today = dateKey(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = dateKey(yesterdayDate);

  if (value === today) return "Today";
  if (value === yesterday) return "Yesterday";

  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

function getCollection(id) {
  return state.collections.find((collection) => collection.id === id);
}

function getCollectionItems(collectionId) {
  return state.items
    .filter((item) => (item.collectionIds || []).includes(collectionId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getSortedItems() {
  return [...state.items].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

function getFilteredItems(items = state.items) {
  const query = state.query.trim().toLowerCase();

  if (!query) return items;

  return items.filter((item) => {
    const collectionNames = (item.collectionIds || [])
      .map((id) => getCollection(id)?.name || "")
      .join(" ");

    const searchable = [
      item.title,
      item.content,
      item.url,
      ...(item.tags || []),
      collectionNames,
      item.type
    ].join(" ").toLowerCase();

    return searchable.includes(query);
  });
}

function collectionCount(collection) {
  return getCollectionItems(collection.id).length;
}

function collectionGlyph(index) {
  const icons = ["folder", "sparkles", "bookmark", "compass", "layers"];
  return iconMarkup(icons[index % icons.length]);
}

function renderSidebar() {
  sidebarCollections.innerHTML = state.collections.map((collection, index) => `
    <button class="collection-link ${
      state.page === "collection" &&
      state.activeCollectionId === collection.id ? "active" : ""
    }" data-open-collection="${escapeHTML(collection.id)}">
      <span class="collection-glyph">${collectionGlyph(index)}</span>
      <span class="collection-name">${escapeHTML(collection.name)}</span>
      <span class="collection-count">${collectionCount(collection)}</span>
    </button>
  `).join("");

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === state.page);
  });
}

function setPage(page) {
  state.page = page;

  if (page !== "collection") {
    state.activeCollectionId = null;
  }

  render();
}

function setCollection(id) {
  if (!getCollection(id)) return;

  state.page = "collection";
  state.activeCollectionId = id;
  render();
}

function setBreadcrumb(label) {
  $("#breadcrumbs").innerHTML = `
    <span>Workspace</span>
    <span class="breadcrumb-divider">/</span>
    <strong>${escapeHTML(label)}</strong>
  `;
}

function pageHeading(eyebrow, title, description, button = "") {
  return `
    <div class="page-heading">
      <div>
        <div class="eyebrow">${escapeHTML(eyebrow)}</div>
        <h1>${escapeHTML(title)}</h1>
        <p>${escapeHTML(description)}</p>
      </div>
      ${button}
    </div>
  `;
}

function sectionTitle(title, subtitle = "", action = "") {
  return `
    <div class="section-title-row">
      <div>
        <h2>${escapeHTML(title)}</h2>
        ${subtitle ? `<p>${escapeHTML(subtitle)}</p>` : ""}
      </div>
      ${action}
    </div>
  `;
}

function itemCover(item) {
  const imageUrl = safeUrl(item.image);
  const isSoft = state.cardStyle === "soft";
  if (isSoft) {
    if (item.type === "image" && imageUrl) {
      return `
        <div class="item-cover item-cover-preview item-cover-image">
          <img src="${escapeHTML(imageUrl)}" alt="" loading="lazy"
            onerror="this.style.display='none'; this.parentElement.classList.add('item-cover-preview-failed')">
          <span class="cover-fallback-icon" hidden>${iconMarkup("image")}</span>
          <span class="cover-type">IMAGE</span>
        </div>`;
    }
    if (item.type === "bookmark") {
      const previewUrl = imageUrl || (safeUrl(item.url)
        ? "https://s.wordpress.com/mshots/v1/" + encodeURIComponent(safeUrl(item.url)) + "?w=1200"
        : "");
      if (previewUrl) {
        return `
        <div class="item-cover item-cover-preview item-cover-bookmark">
          <img src="${escapeHTML(previewUrl)}" alt="" loading="lazy"
            onerror="this.style.display='none'; this.parentElement.classList.add('item-cover-preview-failed')">
          <span class="cover-fallback-icon" hidden>${iconMarkup("link-2")}</span>
          <span class="cover-type">BOOKMARK</span>
        </div>`;
      }
    }
    if (item.type === "note" && item.content?.trim()) {
      return `
        <div class="item-cover item-cover-preview item-cover-note">
          <div class="cover-note-text">${escapeHTML(item.content.trim())}</div>
          <span class="cover-type">NOTE</span>
        </div>`;
    }
    return `
      <div class="item-cover item-cover-preview item-cover-fallback">
        <div class="cover-placeholder">${iconMarkup(typeSymbols[item.type] || "sticky-note")}</div>
        <span class="cover-type">${escapeHTML(typeNames[item.type] || "Item")}</span>
      </div>`;
  }
  if (imageUrl) {
    return `
      <div class="item-cover">
        <img src="${escapeHTML(imageUrl)}" alt="" loading="lazy"
          onerror="this.style.display='none'; this.parentElement.classList.add('cover-fallback')">
        <span class="cover-type">${escapeHTML(typeNames[item.type])}</span>
      </div>`;
  }
  if (item.type === "bookmark" && safeUrl(item.url)) {
    return `
      <div class="item-cover">
        <div class="cover-placeholder">${iconMarkup("link-2")}</div>
        <span class="cover-type">BOOKMARK</span>
      </div>`;
  }
  return `
    <div class="item-cover">
      <div class="cover-placeholder">${iconMarkup(typeSymbols[item.type] || "sticky-note")}</div>
      <span class="cover-type">${escapeHTML(typeNames[item.type] || "Note")}</span>
    </div>`;
}

function itemTags(item) {
  if (!item.tags?.length) return "";

  return `
    <div class="item-tags">
      ${item.tags.slice(0, 4).map((tag) =>
        `<span class="tag-chip">${escapeHTML(tag)}</span>`
      ).join("")}
    </div>
  `;
}

function itemCard(item) {
  const cardStyle = state.cardStyle === "soft" ? "card-style-soft" : "card-style-mono";
  return `
    <article class="item-card ${cardStyle} item-kind-${escapeHTML(item.type)}" data-item-card="${escapeHTML(item.id)}">
      ${itemCover(item)}
      <div class="item-body">
        <div class="item-type">
          <span class="type-dot ${escapeHTML(item.type)}"></span>
          ${escapeHTML(typeNames[item.type] || "Item")}
        </div>
        <h3>${escapeHTML(item.title)}</h3>
        ${item.content && !(state.cardStyle === "soft" && item.type === "note") ? `
          <p class="item-description">${escapeHTML(item.content)}</p>` : ""}
        ${itemTags(item)}
        <div class="item-meta">
          <span>${formatDate(item.createdAt)}</span>
          <span class="item-actions">
            <button class="item-action" data-edit-item="${escapeHTML(item.id)}">Edit</button>
          </span>
        </div>
      </div>
    </article>`;
}

function emptyState(title, description, buttonLabel = "Create item") {
  return `
    <div class="empty-state">
      <div class="empty-icon">${iconMarkup("sparkles")}</div>
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(description)}</p>
      <button class="button primary" id="emptyCreateBtn">
        ${iconMarkup("plus")} ${escapeHTML(buttonLabel)}
      </button>
    </div>
  `;
}

function renderGallery(items, options = {}) {
  const filtered = getFilteredItems(items);

  if (!filtered.length) {
    return emptyState(
      state.query ? "No matching items" : "Nothing here yet",
      state.query
        ? "Try another search term."
        : "Add an item and start collecting ideas."
    );
  }

  return `
    <div class="gallery-toolbar">
      <div class="toolbar-left">
        <div class="view-switcher" aria-label="Gallery layout">
          ${["grid", "wall", "river"].map((layout) => `
            <button class="view-button ${
              state.layout === layout ? "active" : ""
            }" data-layout="${layout}">
              ${layout.charAt(0).toUpperCase() + layout.slice(1)}
            </button>
          `).join("")}
        </div>

        <div class="card-style-switcher card-style-current-${state.cardStyle}" aria-label="Card style">
          <button class="card-style-button" data-card-style="mono" aria-pressed="${state.cardStyle === "mono"}">Mono</button>
          <button class="card-style-button" data-card-style="soft" aria-pressed="${state.cardStyle === "soft"}">Soft</button>
        </div>

        <span class="item-count">
          ${filtered.length} ${filtered.length === 1 ? "item" : "items"}
        </span>
      </div>

      ${options.showSearch === false ? "" : `
        <div class="toolbar-right">
          <input class="select-input gallery-search"
            placeholder="Search items..."
            value="${escapeHTML(state.query)}"
            aria-label="Search items">
        </div>
      `}
    </div>

    <div class="item-grid layout-${state.layout}">
      ${filtered.map(itemCard).join("")}
    </div>
  `;
}

function renderHome() {
  setBreadcrumb("Home");

  const recent = getSortedItems().slice(0, 5);
  const totalItems = state.items.length;
  const totalCollections = state.collections.length;
  const bookmarkCount = state.items.filter(
    (item) => item.type === "bookmark"
  ).length;

  pageContent.innerHTML = `
    ${pageHeading(
      "LAYERBASE",
      "Home",
      "",
      `<button class="button primary" data-action="new-item">${iconMarkup("plus")} New item</button>`
    )}

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">All items</div>
        <div class="stat-value">${totalItems}</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Collections</div>
        <div class="stat-value">${totalCollections}</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Bookmarks</div>
        <div class="stat-value">${bookmarkCount}</div>
      </div>
    </div>

    <section class="section-block">
      ${sectionTitle(
        "Recents",
        "",
        `<button class="text-button" data-page="timeline">View timeline →</button>`
      )}

      ${
        recent.length
          ? `<div class="item-grid layout-grid recents-grid">
              ${recent.map(itemCard).join("")}
            </div>`
          : emptyState(
              "No items yet",
              "Create your first item."
            )
      }
    </section>

    <section class="section-block">
      ${sectionTitle(
        "Collections",
        "",
        `<button class="text-button" data-page="collections">View all →</button>`
      )}

      <div class="collection-grid">
        ${state.collections.slice(0, 3).map(collectionCard).join("")}
      </div>
    </section>
  `;
}

function collectionCard(collection, index = 0) {
  return `
    <article class="collection-card"
      data-open-collection="${escapeHTML(collection.id)}">
      <div class="collection-card-top">
        <div class="collection-icon">${collectionGlyph(index)}</div>
        <span class="collection-count">
          ${collectionCount(collection)} items
        </span>
      </div>

      <h3>${escapeHTML(collection.name)}</h3>
      <p>${escapeHTML(collection.description || "A personal collection.")}</p>

      <div class="collection-card-bottom">
        <span>Collection</span>
        <span>Open →</span>
      </div>
    </article>
  `;
}

function renderCollections() {
  setBreadcrumb("Collections");

  pageContent.innerHTML = `
    ${pageHeading(
      "YOUR WORKSPACE",
      "Collections",
      "Bring related items together, without making copies.",
      `<button class="button primary" id="createCollectionMain">${iconMarkup("plus")} New collection</button>`
    )}

    <div class="collection-grid">
      ${state.collections.map(collectionCard).join("")}
    </div>

    ${state.collections.length === 0 ? emptyState(
      "Create your first collection",
      "A collection is a place to bring related ideas together.",
      "New collection"
    ) : ""}
  `;
}

function renderCollection() {
  const collection = getCollection(state.activeCollectionId);

  if (!collection) {
    state.page = "collections";
    renderCollections();
    return;
  }

  setBreadcrumb(collection.name);

  const items = getCollectionItems(collection.id);

  pageContent.innerHTML = `
    ${pageHeading(
      "COLLECTION",
      collection.name,
      collection.description || "A personal collection.",
      `<button class="button primary" data-action="new-item">${iconMarkup("plus")} Add item</button>`
    )}

    ${renderGallery(items)}
  `;
}

function renderTimeline() {
  setBreadcrumb("Timeline");

  const items = getFilteredItems(getSortedItems());
  const groups = new Map();

  items.forEach((item) => {
    const key = dateKey(item.createdAt);

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  const timelineHTML = [...groups.entries()].map(([key, group]) => `
    <section class="timeline-day">
      <div class="timeline-date">
        <strong>${escapeHTML(dayLabel(key))}</strong>
        ${group.length} ${group.length === 1 ? "item" : "items"}
      </div>

      <div class="timeline-items">
        ${group.map((item) => `
          <article class="timeline-entry"
            data-item-card="${escapeHTML(item.id)}">
            <div class="timeline-thumb">
              ${safeUrl(item.image)
                ? `<img src="${escapeHTML(item.image)}" alt="" loading="lazy">`
                : iconMarkup(typeSymbols[item.type] || "sticky-note")}
            </div>

            <div>
              <div class="item-type">
                <span class="type-dot ${escapeHTML(item.type)}"></span>
                ${escapeHTML(typeNames[item.type] || "Item")}
                · ${formatTime(item.createdAt)}
              </div>
              <h3>${escapeHTML(item.title)}</h3>
              <p>${escapeHTML(item.content || item.url || "No description yet.")}</p>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `).join("");

  pageContent.innerHTML = `
    ${pageHeading(
      "YOUR ACTIVITY",
      "Timeline",
      "Follow the trail of everything you've collected.",
      `<button class="button primary" data-action="new-item">${iconMarkup("plus")} New item</button>`
    )}

    <div class="gallery-toolbar">
      <div class="toolbar-left">
        <span class="item-count">${items.length} items</span>
      </div>
      <div class="toolbar-right">
        <input class="select-input gallery-search"
          placeholder="Search timeline..."
          value="${escapeHTML(state.query)}"
          aria-label="Search timeline">
      </div>
    </div>

    ${timelineHTML || emptyState(
      "No items to show",
      "Try a different search or add a new item."
    )}
  `;
}

function renderSearchPage() {
  setBreadcrumb("Search");

  pageContent.innerHTML = `
    ${pageHeading(
      "YOUR WORKSPACE",
      "Search",
      "Find notes, bookmarks, images and collections."
    )}

    <div class="search-box">
      <input class="text-input gallery-search"
        id="mainSearchInput"
        placeholder="Search your workspace..."
        value="${escapeHTML(state.query)}">
    </div>

    ${renderGallery(getSortedItems(), { showSearch: false })}
  `;

  $("#mainSearchInput")?.focus();
}

function render() {
  renderSidebar();

  switch (state.page) {
    case "timeline":
      renderTimeline();
      break;
    case "collections":
      renderCollections();
      break;
    case "collection":
      renderCollection();
      break;
    case "search":
      renderSearchPage();
      break;
    default:
      renderHome();
  }

  if (window.lucide) lucide.createIcons();
}

function openModal(item = null) {
  state.editingItemId = item?.id || null;

  $("#modalTitle").textContent = item ? "Edit item" : "New item";
  itemForm.hidden = false;
  collectionForm.hidden = true;
  itemForm.reset();
  collectionForm.reset();
  $("#editItemId").value = item?.id || "";

  const type = item?.type || "note";
  const radio = document.querySelector(
    `input[name="itemType"][value="${type}"]`
  );

  if (radio) radio.checked = true;

  $("#itemTitle").value = item?.title || "";
  $("#itemUrl").value = item?.url || "";
  $("#itemImage").value = item?.image || "";
  $("#itemContent").value = item?.content || "";
  $("#itemTags").value = (item?.tags || []).join(", ");

  const currentCollectionId =
    state.activeCollectionId ||
    item?.collectionIds?.[0] ||
    "";

  $("#itemCollection").innerHTML = `
    <option value="">No collection</option>
    ${state.collections.map((collection) => `
      <option value="${escapeHTML(collection.id)}">
        ${escapeHTML(collection.name)}
      </option>
    `).join("")}
  `;

  $("#itemCollection").value = currentCollectionId;

  updateConditionalFields();

  modalBackdrop.classList.add("open");
  $("#itemTitle").focus();
}

function openCollectionModal() {
  state.editingItemId = null;
  itemForm.hidden = true;
  collectionForm.hidden = false;
  collectionForm.reset();
  $("#modalTitle").textContent = "New collection";
  modalBackdrop.classList.add("open");
  $("#collectionName").focus();
}

function closeModal() {
  modalBackdrop.classList.remove("open");
  state.editingItemId = null;
  itemForm.hidden = false;
  collectionForm.hidden = true;
}

function updateConditionalFields() {
  const type = document.querySelector(
    'input[name="itemType"]:checked'
  )?.value || "note";

  $("#urlField").hidden = type !== "bookmark";
  $("#imageField").hidden = type !== "image";
}

function saveItem(event) {
  event.preventDefault();

  const title = $("#itemTitle").value.trim();

  if (!title) {
    $("#itemTitle").focus();
    return;
  }

  const type = document.querySelector(
    'input[name="itemType"]:checked'
  )?.value || "note";

  const existing = state.items.find(
    (item) => item.id === state.editingItemId
  );

  const selectedCollection = $("#itemCollection").value;
  const tags = $("#itemTags").value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const item = {
    id: existing?.id || uid(),
    type,
    title,
    url: type === "bookmark" ? safeUrl($("#itemUrl").value) : "",
    image: type === "image" ? safeUrl($("#itemImage").value) : "",
    content: $("#itemContent").value.trim(),
    tags,
    collectionIds: selectedCollection
      ? [selectedCollection]
      : [],
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existing) {
    const index = state.items.findIndex(
      (entry) => entry.id === existing.id
    );

    // Preserve other collection memberships when editing.
    if (selectedCollection) {
      item.collectionIds = [
        ...new Set([
          ...existing.collectionIds.filter(
            (id) => id !== selectedCollection
          ),
          selectedCollection
        ])
      ];
    }

    state.items[index] = item;
  } else {
    state.items.unshift(item);
  }

  saveData();
  closeModal();
  render();

  showToast(existing ? "Item updated" : "Item saved");
}

function createCollection(event) {
  event.preventDefault();

  const name = $("#collectionName").value.trim();
  if (!name) {
    $("#collectionName").focus();
    return;
  }

  const description = $("#collectionDescription").value.trim();
  const collection = {
    id: uid("col"),
    name,
    description,
    createdAt: new Date().toISOString()
  };

  state.collections.push(collection);
  saveData();

  closeModal();
  state.page = "collections";
  state.activeCollectionId = null;
  render();

  showToast("Collection created");
}

let toastTimer;

function showToast(message) {
  const toast = $("#toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2400);
}

function startNewItem() {
  openModal();
}

document.addEventListener("click", (event) => {
  const pageButton = event.target.closest("[data-page]");

  if (pageButton) {
    event.preventDefault();
    setPage(pageButton.dataset.page);
    return;
  }

  const collectionButton = event.target.closest("[data-open-collection]");

  if (collectionButton) {
    setCollection(collectionButton.dataset.openCollection);
    return;
  }

  const newItemButton = event.target.closest(
    '[data-action="new-item"]'
  );

  if (newItemButton || event.target.closest("#newItemBtn")) {
    startNewItem();
    return;
  }

  if (event.target.closest("#addCollectionBtn") ||
      event.target.closest("#createCollectionMain")) {
    openCollectionModal();
    return;
  }

  const layoutButton = event.target.closest("[data-layout]");

  if (layoutButton) {
    state.layout = layoutButton.dataset.layout;
    render();
    return;
  }

  const cardStyleButton = event.target.closest("[data-card-style]");

  if (cardStyleButton) {
    state.cardStyle = cardStyleButton.dataset.cardStyle === "mono" ? "mono" : "soft";
    try {
      localStorage.setItem("layerbase-card-style", state.cardStyle);
    } catch (_) {}
    render();
    return;
  }

  const editButton = event.target.closest("[data-edit-item]");

  if (editButton) {
    const item = state.items.find(
      (entry) => entry.id === editButton.dataset.editItem
    );

    if (item) openModal(item);
    return;
  }

  const itemCardElement = event.target.closest("[data-item-card]");

  if (itemCardElement) {
    const item = state.items.find(
      (entry) => entry.id === itemCardElement.dataset.itemCard
    );

    if (item) openModal(item);
    return;
  }

  if (event.target.closest("#emptyCreateBtn")) {
    startNewItem();
    return;
  }

  if (event.target.closest("#searchBtn")) {
    state.page = "search";
    state.query = "";
    render();
  }
});

document.addEventListener("input", (event) => {
  if (event.target.matches(".gallery-search")) {
    const input = event.target;
    const cursor = input.selectionStart;
    const wasFocused = document.activeElement === input;

    state.query = input.value;
    render();

    const replacement = document.querySelector(
      input.id
        ? `.gallery-search#${input.id}`
        : ".gallery-search"
    );

    if (replacement && wasFocused) {
      replacement.focus();
      if (typeof cursor === "number") {
        replacement.setSelectionRange(cursor, cursor);
      }
    }
  }
});

document.querySelectorAll('input[name="itemType"]').forEach((radio) => {
  radio.addEventListener("change", updateConditionalFields);
});

itemForm.addEventListener("submit", saveItem);
collectionForm.addEventListener("submit", createCollection);

$("#closeModalBtn").addEventListener("click", closeModal);
$("#cancelModalBtn").addEventListener("click", closeModal);
$("#cancelCollectionBtn").addEventListener("click", closeModal);

modalBackdrop.addEventListener("click", (event) => {
  if (event.target === modalBackdrop) closeModal();
});

document.addEventListener("keydown", (event) => {
  const activeTag = document.activeElement?.tagName;
  const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(activeTag);

  if (event.key === "Escape") {
    closeModal();
  }

  if (!typing && event.key.toLowerCase() === "n") {
    event.preventDefault();
    startNewItem();
  }

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    state.page = "search";
    state.query = "";
    render();
  }
});

// The delegated click handler above handles these sidebar buttons too.
// Avoid duplicate listeners, which can open the same action twice.
render();
