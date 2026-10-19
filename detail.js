/* Layerbase item reading view */
(() => {
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  let currentId = null;

  function openDetail(item) {
    if (!item) return;
    currentId = item.id;
    $("#detailBreadcrumb").textContent = typeNames[item.type] || "Item";
    const root = $("#detailContent");
    root.replaceChildren();

    const typeRow = el("div", "detail-type-row");
    const typeIcon = el("span", "detail-type-icon");
    typeIcon.innerHTML = iconMarkup(typeSymbols[item.type] || "sticky-note");
    typeRow.append(typeIcon, el("span", "", typeNames[item.type] || "Item"), el("span", "detail-dot", "·"), el("span", "", "Created " + formatDate(item.createdAt)));
    root.append(typeRow, el("h1", "detail-title", item.title));
    $("#detailTitle")?.removeAttribute("id");
    root.lastElementChild.id = "detailTitle";

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
    footer.append(edit);
    root.append(footer);
    $("#detailBackdrop").hidden = false;
    document.body.classList.add("detail-open");
    if (window.lucide) lucide.createIcons();
  }

  function closeDetail() {
    $("#detailBackdrop").hidden = true;
    document.body.classList.remove("detail-open");
    currentId = null;
  }
  function editDetail() {
    const item = state.items.find(entry => entry.id === currentId);
    if (!item) return;
    closeDetail();
    openModal(item);
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
  $("#detailEditBtn").addEventListener("click", editDetail);
  $("#detailContent").addEventListener("click", event => {
    if (event.target.closest("#detailEditInline")) editDetail();
  });
  $("#detailBackdrop").addEventListener("click", event => {
    if (event.target === $("#detailBackdrop")) closeDetail();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !$("#detailBackdrop").hidden) closeDetail();
  });
})();
