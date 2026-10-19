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

  function normalizeBlocks(item) {
    if (Array.isArray(item.contentBlocks)) return item.contentBlocks;
    const legacy = item.content || "";
    item.contentBlocks = legacy.trim()
      ? legacy.split(/\\n\\s*\\n/).map((text, index) => ({ id: "block-" + index + "-" + Date.now(), type: "paragraph", text }))
      : [{ id: "block-" + Date.now(), type: "paragraph", text: "" }];
    return item.contentBlocks;
  }

  function blockText(blocks) {
    return blocks.map(block => block.text || "").filter((text, index, arr) => text || index < arr.length - 1).join("\\n\\n");
  }

  function persistBlocks(blocks) {
    persist(item => {
      item.contentBlocks = blocks;
      item.content = blockText(blocks);
    });
  }

  function blockAddMenu(blocks, insertAt) {
    const menu = make("div", "detail-block-menu");
    [
      ["paragraph", "Paragraph", "pilcrow"],
      ["heading", "Heading", "heading-2"],
      ["bulleted", "Bulleted list", "list"],
      ["numbered", "Numbered list", "list-ordered"],
      ["quote", "Quote", "quote"]
    ].forEach(([type, label, icon]) => {
      const button = make("button", "detail-block-menu-item");
      button.type = "button";
      const glyph = make("span", "detail-block-menu-icon", "");
      glyph.innerHTML = window.lucide ? "" : "•";
      if (window.lucide) glyph.innerHTML = '<i data-lucide="' + icon + '"></i>';
      button.append(glyph, make("span", "", label));
      button.addEventListener("click", () => {
        const next = [...blocks];
        next.splice(insertAt, 0, { id: "block-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7), type, text: "" });
        persistBlocks(next);
        const last = $("#detailContent .detail-doc-block[data-block-index='" + insertAt + "']");
        if (last) last.click();
      });
      menu.append(button);
    });
    if (window.lucide) lucide.createIcons();
    return menu;
  }

  function renderDocBlocks(item, body) {
    const blocks = normalizeBlocks(item);
    const doc = make("div", "detail-doc");
    const renderBlock = (block, index) => {
      const wrap = make("div", "detail-doc-block-wrap");
      const blockNode = make(block.type === "heading" ? "h2" : block.type === "quote" ? "blockquote" : "div",
        "detail-doc-block detail-doc-" + block.type, "");
      blockNode.dataset.blockIndex = String(index);
      blockNode.dataset.blockId = block.id;
      blockNode.tabIndex = 0;
      blockNode.setAttribute("role", "button");
      blockNode.setAttribute("aria-label", "Edit " + block.type + " block");
      const text = block.text || "";
      if (block.type === "bulleted" || block.type === "numbered") {
        const list = make(block.type === "numbered" ? "ol" : "ul", "detail-doc-list");
        (text ? text.split("\\n") : [""]).forEach(line => list.append(make("li", "", line)));
        blockNode.append(list);
      } else {
        blockNode.textContent = text || (block.type === "heading" ? "Heading" : block.type === "quote" ? "Quote" : "Click to write…");
        if (!text) blockNode.classList.add("is-empty");
      }
      const edit = () => {
        if (activeEditor) return;
        activeEditor = true;
        const editor = make("textarea", "detail-inline-input detail-inline-textarea detail-block-editor");
        editor.value = text;
        editor.rows = Math.max(1, Math.min(8, (text.match(/\\n/g) || []).length + 1));
        editor.setAttribute("aria-label", "Edit block text");
        blockNode.replaceChildren(editor);
        blockNode.classList.add("is-editing");
        editor.focus();
        editor.style.height = "auto";
        editor.style.height = Math.max(block.type === "heading" ? 44 : 36, editor.scrollHeight) + "px";
        let finished = false;
        const finish = commit => {
          if (finished) return;
          finished = true;
          activeEditor = false;
          if (commit && editor.value !== text) {
            const next = blocks.map((entry, i) => i === index ? { ...entry, text: editor.value } : entry);
            persistBlocks(next);
          } else renderDetail();
        };
        editor.addEventListener("keydown", event => {
          if (event.key === "Escape") { event.preventDefault(); finish(false); }
          else if (event.key === "Enter" && event.metaKey) { event.preventDefault(); finish(true); }
        });
        editor.addEventListener("blur", () => finish(true));
      };
      blockNode.addEventListener("click", edit);
      blockNode.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); edit(); }
      });
      const controls = make("div", "detail-block-controls");
      const add = make("button", "detail-block-add", "+");
      add.type = "button";
      add.title = "Add block below";
      add.setAttribute("aria-label", "Add block below");
      add.addEventListener("click", event => {
        event.stopPropagation();
        doc.querySelectorAll(".detail-block-menu").forEach(menu => menu.remove());
        wrap.append(blockAddMenu(blocks, index + 1));
      });
      const remove = make("button", "detail-block-remove", "×");
      remove.type = "button";
      remove.title = "Delete block";
      remove.setAttribute("aria-label", "Delete block");
      remove.addEventListener("click", event => {
        event.stopPropagation();
        const next = blocks.filter((entry, i) => i !== index);
        persistBlocks(next.length ? next : [{ id: "block-" + Date.now(), type: "paragraph", text: "" }]);
      });
      controls.append(add, remove);
      wrap.append(blockNode, controls);
      return wrap;
    };
    blocks.forEach((block, index) => doc.append(renderBlock(block, index)));
    const addLast = make("button", "detail-doc-add-last", "+ Add a block");
    addLast.type = "button";
    addLast.addEventListener("click", () => {
      doc.querySelectorAll(".detail-block-menu").forEach(menu => menu.remove());
      doc.append(blockAddMenu(blocks, blocks.length));
    });
    doc.append(addLast);
    body.append(doc);
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
    body.append(bodyLabel);
    renderDocBlocks(item, body);

    if (item.type === "image" && safeUrl(item.image)) {
      const figure = make("figure", "detail-image");
      const img = make("img");
      img.src = safeUrl(item.image);
      img.alt = item.title;
      figure.append(img);
      body.insertBefore(figure, body.querySelector(".detail-doc"));
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
      body.insertBefore(link, body.querySelector(".detail-doc"));
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
