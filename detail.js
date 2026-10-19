/* Layerbase item reader with an inline edit mode */
(() => {
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  let currentId = null;
  let editing = false;

  function field(labelText, name, value, options = {}) {
    const wrap = el("label", "detail-edit-field");
    wrap.append(el("span", "detail-edit-label", labelText));
    let input;
    if (options.multiline) {
      input = el("textarea", "detail-edit-input detail-edit-textarea");
      input.rows = options.rows || 5;
    } else if (options.select) {
      input = el("select", "detail-edit-input");
      options.select.forEach(option => {
        const node = el("option", "", option.label);
        node.value = option.value;
        input.append(node);
      });
    } else {
      input = el("input", "detail-edit-input");
      input.type = "text";
    }
    input.name = name;
    input.value = value || "";
    wrap.append(input);
    return wrap;
  }

  function buildEditor(item) {
    const root = $("#detailContent");
    root.replaceChildren();
    const form = el("form", "detail-inline-editor");
    form.id = "detailInlineForm";
    form.append(field("Title", "title", item.title));
    form.append(field("Type", "type", item.type, {
      select: [
        { value: "note", label: "Note" },
        { value: "bookmark", label: "Bookmark" },
        { value: "image", label: "Image" }
      ]
    }));
    form.append(field("URL", "url", item.url));
    form.append(field("Image URL", "image", item.image));
    form.append(field("Content", "content", item.content, { multiline: true, rows: 8 }));
    form.append(field("Tags · comma separated", "tags", (item.tags || []).join(", ")));

    const collections = el("fieldset", "detail-edit-field detail-edit-collections");
    collections.append(el("legend", "detail-edit-label", "Collections"));
    const selected = new Set(item.collectionIds || []);
    state.collections.forEach(collection => {
      const label = el("label", "detail-collection-option");
      const checkbox = el("input");
      checkbox.type = "checkbox";
      checkbox.name = "collectionIds";
      checkbox.value = collection.id;
      checkbox.checked = selected.has(collection.id);
      label.append(checkbox, el("span", "", collection.name));
      collections.append(label);
    });
    form.append(collections);

    const actions = el("div", "detail-edit-actions");
    const cancel = el("button", "button secondary", "Cancel");
    cancel.type = "button";
    cancel.addEventListener("click", () => renderDetail());
    const save = el("button", "button primary", "Save changes");
    save.type = "submit";
    actions.append(cancel, save);
    form.append(actions);
    form.addEventListener("submit", saveInline);
    form.querySelector('[name="type"]').addEventListener("change", updateTypeFields);
    root.append(form);
    updateTypeFields();
  }

  function updateTypeFields() {
    const form = $("#detailInlineForm");
    if (!form) return;
    const type = form.elements.type.value;
    const urlField = form.elements.url.closest(".detail-edit-field");
    const imageField = form.elements.image.closest(".detail-edit-field");
    urlField.hidden = type !== "bookmark";
    imageField.hidden = type !== "image";
  }

  function saveInline(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const title = form.elements.title.value.trim();
    if (!title) {
      form.elements.title.focus();
      return;
    }
    const item = state.items.find(entry => entry.id === currentId);
    if (!item) return;
    const type = form.elements.type.value;
    const rawUrl = form.elements.url.value.trim();
    const rawImage = form.elements.image.value.trim();
    item.title = title;
    item.type = type;
    item.url = type === "bookmark" ? safeUrl(rawUrl) : "";
    item.image = type === "image" ? safeUrl(rawImage) : "";
    item.content = form.elements.content.value.trim();
    item.tags = form.elements.tags.value.split(",").map(tag => tag.trim()).filter(Boolean);
    item.collectionIds = [...form.querySelectorAll('[name="collectionIds"]:checked')].map(input => input.value);
    item.updatedAt = new Date().toISOString();
    saveData();
    editing = false;
    render();
    renderDetail();
    showToast("Item updated");
  }

  function renderDetail() {
    const item = state.items.find(entry => entry.id === currentId);
    if (!item) return closeDetail();
    editing = false;
    $("#detailBreadcrumb").textContent = typeNames[item.type] || "Item";
    $("#detailEditBtn").hidden = false;
    const root = $("#detailContent");
    root.replaceChildren();

    const typeRow = el("div", "detail-type-row");
    const typeIcon = el("span", "detail-type-icon");
    typeIcon.innerHTML = iconMarkup(typeSymbols[item.type] || "sticky-note");
    typeRow.append(typeIcon, el("span", "", typeNames[item.type] || "Item"), el("span", "detail-dot", "·"), el("span", "", "Created " + formatDate(item.createdAt)));
    const title = el("h1", "detail-title", item.title);
    title.id = "detailTitle";
    root.append(typeRow, title);

    const image = safeUrl(item.image);
    if (image) {
      const figure = el("figure", "detail-image");
      const img = el("img");
      img.src = image;
      img.alt = item.title;
      figure.append(img);
      root.append(figure);
    }
    const link = safeUrl(item.url);
    if (link) {
      const a = el("a", "detail-link");
      a.href = link;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      const linkIcon = el("span", "detail-link-icon");
      linkIcon.innerHTML = iconMarkup("external-link");
      const copy = el("span", "detail-link-copy");
      copy.append(el("strong", "", new URL(link).hostname), el("small", "", link));
      a.append(linkIcon, copy);
      root.append(a);
    }
    root.append(item.content ? el("div", "detail-prose", item.content) : el("div", "detail-empty-content", "No content yet."));
    if (item.tags && item.tags.length) {
      const section = el("section", "detail-section");
      section.append(el("div", "detail-section-label", "TAGS"));
      const tags = el("div", "detail-tags");
      item.tags.forEach(tag => tags.append(el("span", "detail-tag", tag)));
      section.append(tags);
      root.append(section);
    }
    const names = (item.collectionIds || []).map(id => state.collections.find(c => c.id === id)?.name).filter(Boolean);
    if (names.length) {
      const section = el("section", "detail-section");
      section.append(el("div", "detail-section-label", "IN COLLECTIONS"));
      const list = el("div", "detail-collections");
      names.forEach(name => list.append(el("span", "detail-collection", name)));
      section.append(list);
      root.append(section);
    }
    const footer = el("footer", "detail-footer");
    footer.append(el("span", "", "Last edited " + formatDate(item.updatedAt || item.createdAt)));
    const edit = el("button", "button secondary", "Edit item");
    edit.type = "button";
    edit.id = "detailEditInline";
    edit.addEventListener("click", startEdit);
    footer.append(edit);
    root.append(footer);
    if (window.lucide) lucide.createIcons();
  }

  function startEdit() {
    const item = state.items.find(entry => entry.id === currentId);
    if (!item) return;
    editing = true;
    $("#detailEditBtn").hidden = true;
    buildEditor(item);
  }

  function openDetail(item) {
    if (!item) return;
    currentId = item.id;
    $("#detailBackdrop").hidden = false;
    document.body.classList.add("detail-open");
    renderDetail();
  }

  function closeDetail() {
    $("#detailBackdrop").hidden = true;
    document.body.classList.remove("detail-open");
    currentId = null;
    editing = false;
    $("#detailEditBtn").hidden = false;
  }

  document.addEventListener("click", event => {
    if (event.target.closest("[data-edit-item]")) return;
    const card = event.target.closest("[data-item-card]");
    if (!card) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openDetail(state.items.find(item => item.id === card.dataset.itemCard));
  }, true);
  $("#closeDetailBtn").addEventListener("click", closeDetail);
  $("#detailEditBtn").addEventListener("click", startEdit);
  $("#detailBackdrop").addEventListener("click", event => {
    if (event.target === $("#detailBackdrop")) closeDetail();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !$("#detailBackdrop").hidden) closeDetail();
  });
})();
