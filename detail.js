/* Layerbase document view: click any property or text block to edit it in place. */
(() => {
  const $ = (selector) => document.querySelector(selector);
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  let currentId = null;
  let activeEditor = false;

  function currentItem() { return state.items.find(item => item.id === currentId); }

  function persist(mutator, message = "Item updated") {
    const item = currentItem();
    if (!item) return;
    mutator(item);
    item.updatedAt = new Date().toISOString();
    saveData();
    render();
    renderDetail();
    showToast(message);
  }

  function startFieldEdit(target, config) {
    if (activeEditor || !target || target.querySelector("input, textarea, select")) return;
    const original = target.dataset.value || "";
    activeEditor = true;
    const control = config.multiline ? make("textarea", "detail-inline-input detail-inline-textarea") :
      config.options ? make("select", "detail-inline-input") : make("input", "detail-inline-input");
    if (control.tagName === "INPUT") control.type = "text";
    if (config.options) config.options.forEach(option => {
      const choice = make("option", "", option.label);
      choice.value = option.value;
      control.append(choice);
    });
    control.value = config.options ? config.options.find(option => option.label === original)?.value || original : original;
    target.replaceChildren(control);
    target.classList.add("is-editing");
    control.focus();
    if (config.multiline) {
      control.rows = Math.max(4, Math.min(12, (original.match(/\n/g) || []).length + 3));
      control.style.height = "auto";
      control.style.height = Math.max(130, control.scrollHeight) + "px";
    } else if (control.tagName === "INPUT") control.select();

    let committed = false;
    const finish = (commit) => {
      if (committed) return;
      committed = true;
      activeEditor = false;
      const value = control.value.trim();
      if (commit && value !== original) persist(entry => config.apply(entry, value));
      else renderDetail();
    };
    control.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish(false);
      } else if (event.key === "Enter" && !config.multiline) {
        event.preventDefault();
        finish(true);
      } else if (event.key === "Enter" && event.metaKey) {
        event.preventDefault();
        finish(true);
      }
    });
    control.addEventListener("blur", () => finish(true));
    if (config.options) control.addEventListener("change", () => finish(true));
  }

  function property(label, value, config, extraClass = "") {
    const row = make("div", "detail-property " + extraClass);
    row.append(make("span", "detail-property-name", label));
    const valueNode = make("div", "detail-property-value", value || "Add…");
    valueNode.tabIndex = 0;
    valueNode.setAttribute("role", "button");
    valueNode.dataset.value = value || "";
    valueNode.setAttribute("aria-label", "Edit " + label);
    const editValue = event => {
      event.stopPropagation();
      startFieldEdit(valueNode, config);
    };
    valueNode.addEventListener("click", editValue);
    valueNode.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); editValue(event); }
    });
    row.append(valueNode);
    return row;
  }

  function renderProperties(item, root) {
    const properties = make("section", "detail-properties");
    properties.append(make("div", "detail-properties-heading", "Properties"));
    properties.append(property("Type", typeNames[item.type] || "Note", {
      options: [
        { value: "note", label: "Note" },
        { value: "bookmark", label: "Bookmark" },
        { value: "image", label: "Image" }
      ],
      apply: (entry, value) => {
        entry.type = value;
        if (value !== "bookmark") entry.url = "";
        if (value !== "image") entry.image = "";
      }
    }, "detail-property-type"));

    if (item.type === "bookmark") properties.append(property("URL", item.url || "", {
      apply: (entry, value) => { entry.url = safeUrl(value) || ""; }
    }));
    if (item.type === "image") properties.append(property("Image URL", item.image || "", {
      apply: (entry, value) => { entry.image = safeUrl(value) || ""; }
    }));
    properties.append(property("Tags", (item.tags || []).join(", "), {
      apply: (entry, value) => {
        entry.tags = value.split(",").map(tag => tag.trim()).filter(Boolean);
      }
    }));

    const collectionRow = make("div", "detail-property detail-property-collections");
    collectionRow.append(make("span", "detail-property-name", "Collections"));
    const choices = make("div", "detail-property-value detail-property-value-multiselect");
    const current = new Set(item.collectionIds || []);
    state.collections.forEach(collection => {
      const label = make("label", "detail-collection-check");
      const checkbox = make("input");
      checkbox.type = "checkbox";
      checkbox.checked = current.has(collection.id);
      checkbox.addEventListener("change", () => {
        persist(entry => {
          const ids = new Set(entry.collectionIds || []);
          checkbox.checked ? ids.add(collection.id) : ids.delete(collection.id);
          entry.collectionIds = [...ids];
        });
      });
      label.append(checkbox, make("span", "", collection.name));
      choices.append(label);
    });
    if (!state.collections.length) choices.append(make("span", "detail-muted", "No collections yet"));
    collectionRow.append(choices);
    properties.append(collectionRow);

    const created = make("div", "detail-property");
    created.append(make("span", "detail-property-name", "Created"));
    created.append(make("span", "detail-property-static", formatDate(item.createdAt)));
    properties.append(created);
    root.append(properties);
  }

  function renderDetail() {
    const item = currentItem();
    if (!item) return closeDetail();
    activeEditor = false;
    $("#detailBreadcrumb").textContent = typeNames[item.type] || "Item";
    $("#detailEditBtn").hidden = true;
    const root = $("#detailContent");
    root.replaceChildren();

    const title = make("h1", "detail-title detail-editable", item.title || "Untitled");
    title.dataset.value = item.title || "";
    title.tabIndex = 0;
    title.setAttribute("role", "button");
    title.setAttribute("aria-label", "Click to edit title");
    const editTitle = () => startFieldEdit(title, { apply: (entry, value) => { entry.title = value || "Untitled"; } });
    title.addEventListener("click", editTitle);
    title.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); editTitle(); }
    });
    root.append(title);
    renderProperties(item, root);

    const body = make("section", "detail-body-section");
    const bodyLabel = make("div", "detail-body-label", "Content");
    const content = make("div", "detail-prose detail-editable", item.content || "Click here to add content…");
    content.dataset.value = item.content || "";
    content.classList.toggle("detail-empty-content", !item.content);
    content.tabIndex = 0;
    content.setAttribute("role", "button");
    content.setAttribute("aria-label", "Click to edit content");
    const editContent = () => startFieldEdit(content, { multiline: true, apply: (entry, value) => { entry.content = value; } });
    content.addEventListener("click", editContent);
    content.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); editContent(); }
    });
    bodyLabel.addEventListener("click", editContent);
    body.append(bodyLabel, content);

    if (item.type === "image" && safeUrl(item.image)) {
      const figure = make("figure", "detail-image");
      const img = make("img");
      img.src = safeUrl(item.image);
      img.alt = item.title;
      figure.append(img);
      body.insertBefore(figure, content);
    }
    if (item.type === "bookmark" && safeUrl(item.url)) {
      const link = make("a", "detail-link");
      link.href = safeUrl(item.url);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.append(make("span", "detail-link-icon", "↗"));
      const copy = make("span", "detail-link-copy");
      copy.append(make("strong", "", new URL(safeUrl(item.url)).hostname));
      copy.append(make("small", "", item.url));
      link.append(copy);
      body.insertBefore(link, content);
    }
    const footer = make("footer", "detail-footer");
    footer.append(make("span", "", "Last edited " + formatDate(item.updatedAt || item.createdAt)));
    body.append(footer);
    root.append(body);
    if (window.lucide) lucide.createIcons();
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
    activeEditor = false;
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
  $("#detailEditBtn").hidden = true;
  $("#detailEditBtn").addEventListener("click", () => {});
  $("#detailBackdrop").addEventListener("click", event => {
    if (event.target === $("#detailBackdrop")) closeDetail();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !$("#detailBackdrop").hidden) closeDetail();
  });
})();
