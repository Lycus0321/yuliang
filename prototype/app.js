const spools = [
  {
    id: 1,
    name: "曜石黑",
    brand: "Bambu Lab",
    type: "PLA Basic",
    material: "PLA",
    color: "#202421",
    remaining: 812,
    total: 1000,
    loaded: true,
    device: "X1 Carbon",
    ams: "AMS 1",
    slot: "1 号位",
    mode: "RFID",
    note: "主力黑色耗材",
  },
  {
    id: 2,
    name: "樱花粉",
    brand: "Bambu Lab",
    type: "PLA Matte",
    material: "PLA",
    color: "#E8A4AE",
    remaining: 126,
    total: 1000,
    loaded: true,
    device: "X1 Carbon",
    ams: "AMS 1",
    slot: "3 号位",
    mode: "RFID",
    note: "低余量，打印前检查",
  },
  {
    id: 3,
    name: "透明橙",
    brand: "Polymaker",
    type: "PolyLite PETG",
    material: "PETG",
    color: "#E77431",
    remaining: 518,
    total: 1000,
    loaded: false,
    device: "",
    ams: "",
    slot: "在库",
    mode: "手动",
    note: "第三方便携料盘",
  },
  {
    id: 4,
    name: "哑光白",
    brand: "SUNLU",
    type: "PLA+",
    material: "PLA+",
    color: "#ECECE5",
    remaining: 943,
    total: 1000,
    loaded: false,
    device: "",
    ams: "",
    slot: "在库",
    mode: "手动",
    note: "",
  },
  {
    id: 5,
    name: "深灰",
    brand: "Bambu Lab",
    type: "PETG-CF",
    material: "PETG",
    color: "#555B58",
    remaining: 242,
    total: 1000,
    loaded: true,
    device: "P1S",
    ams: "AMS 1",
    slot: "2 号位",
    mode: "RFID",
    note: "工程件使用",
  },
];

const filamentCatalog = {
  "Bambu Lab": {
    types: [
      "PLA Basic",
      "PETG Basic",
      "PLA Matte",
      "PLA Pure",
      "PLA-CF",
      "PETG-CF",
      "ABS",
      "ASA",
      "TPU 95A",
      "PC",
      "PA-CF",
      "Support for PLA",
    ],
  },
  SUNLU: {
    types: ["PETG", "PLA+", "PLA Matte", "PLA+ 2.0", "Silk PLA+", "Wood PLA", "Marble PLA"],
  },
  eSUN: {
    types: ["PLA+"],
  },
  Polymaker: {
    types: ["PolyLite PLA", "PolyLite PETG", "PolyTerra PLA", "PolyLite ABS", "PolyLite ASA"],
  },
  Overture: {
    types: ["PLA", "Matte PLA"],
  },
  Generic: {
    types: ["PLA", "PETG", "ABS", "ASA", "PC", "TPU", "PA", "PLA-CF", "PETG-CF"],
  },
};

const brandOptions = ["Bambu Lab", "SUNLU", "eSUN", "Polymaker", "Overture", "Generic"];
const commonBrands = ["Bambu Lab", "SUNLU"];

const bambuColors = [
  { name: "黑色", hex: "#000000" },
  { name: "Bambu 绿", hex: "#00AE42" },
  { name: "橙色", hex: "#FF6A13" },
  { name: "蓝灰", hex: "#5B6579" },
  { name: "白色", hex: "#FFFFFF" },
  { name: "灰色", hex: "#8E9089" },
  { name: "红色", hex: "#D6001C" },
  { name: "黄色", hex: "#FCE300" },
  { name: "钴蓝", hex: "#0056B8" },
  { name: "浅灰", hex: "#D1D3D5" },
  { name: "粉色", hex: "#FABBCB" },
  { name: "棕色", hex: "#9D432C" },
  { name: "紫色", hex: "#8A75D1" },
  { name: "深灰", hex: "#545454" },
];

const spoolTarePresets = [
  { id: "bambu-160", name: "Bambu Lab 空盘", grams: 160 },
  { id: "sunlu-200", name: "SUNLU 空盘", grams: 200 },
  { id: "esun-220", name: "eSUN 空盘", grams: 220 },
  { id: "polymaker-200", name: "Polymaker 空盘", grams: 200 },
  { id: "generic-200", name: "通用空盘", grams: 200 },
];

const extraWeightPresets = [
  { id: "extra-none", name: "无", grams: 0 },
  { id: "weight-20", name: "配重块", grams: 20 },
  { id: "bracket-50", name: "金属支架", grams: 50 },
  { id: "adapter-100", name: "转接座", grams: 100 },
];

const viewTitles = {
  library: "耗材库",
  settings: "偏好设置",
  login: "连接账号",
};

const initialView = new URLSearchParams(window.location.search).get("view");
const state = {
  view: viewTitles[initialView] ? initialView : "library",
  filter: "all",
  query: "",
  selectedId: 1,
  modalId: null,
  modalTab: "basic",
  dropdown: null,
  expandedOptions: {
    brand: false,
    type: false,
    color: false,
  },
  selectedBrand: "Bambu Lab",
  selectedType: "PLA Basic",
  selectedColor: "黑色",
  selectedColorHex: "#000000",
  tare: 160,
  extra: 0,
  tarePresetId: "bambu-160",
  extraPresetId: "extra-none",
  gross: null,
  region: "china",
  forceRfid: false,
  hiddenOpen: false,
  toastTimer: null,
};

const viewRoot = document.querySelector("#view-root");
const pageTitle = document.querySelector("#page-title");
const headerPrimary = document.querySelector("#header-primary");
const searchInput = document.querySelector("#global-search");
const modal = document.querySelector("#spool-modal");
const modalContent = document.querySelector("#modal-content");
const modalBackdrop = document.querySelector("#modal-backdrop");
const toast = document.querySelector("#toast");

function selectedSpool() {
  return spools.find((spool) => spool.id === state.selectedId) || spools[0];
}

function locationText(spool) {
  if (!spool.loaded) return "在库";
  return `${spool.device}，${spool.ams}，${spool.slot}`;
}

function totalRemaining() {
  return spools.reduce((sum, spool) => sum + spool.remaining, 0);
}

function showToast(message) {
  toast.querySelector("span").textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

function setView(view) {
  state.view = view;
  pageTitle.textContent = viewTitles[view];
  document.body.classList.toggle("auth-view", view === "login");
  headerPrimary.style.display = view === "library" ? "" : "none";
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
  closeSpoolModal();
  render();
}

function render() {
  if (state.view === "library") renderLibrary();
  if (state.view === "settings") renderSettings();
  if (state.view === "login") renderLogin();
}

function renderLibrary() {
  const query = state.query.trim().toLowerCase();
  const filtered = spools.filter((spool) => {
    if (state.filter === "loaded" && !spool.loaded) return false;
    if (state.filter === "low" && spool.remaining > 250) return false;
    if (!query) return true;
    return [spool.name, spool.brand, spool.type, spool.material, spool.note]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const loadedCount = spools.filter((spool) => spool.loaded).length;
  const lowCount = spools.filter((spool) => spool.remaining <= 250).length;

  viewRoot.innerHTML = `
    <div class="content-grid">
      <section class="overview-panel" aria-label="耗材概览">
        <div class="overview-copy">
          <span class="label">当前剩余总量</span>
          <div class="overview-number">
            <strong>${(totalRemaining() / 1000).toFixed(2)}</strong>
            <span>kg</span>
          </div>
          <p>${spools.length} 盘耗材，${lowCount} 盘低于 250 g</p>
        </div>
        <div class="overview-stats">
          <div class="overview-stat">
            <strong>${loadedCount}</strong>
            <span>已装入 AMS</span>
          </div>
          <div class="overview-stat">
            <strong>${lowCount}</strong>
            <span>低余量</span>
          </div>
          <div class="overview-stat">
            <strong>2</strong>
            <span>材料类型</span>
          </div>
        </div>
      </section>

      <section class="library-toolbar" aria-label="耗材筛选">
        <div class="chip-row">
          <button class="chip ${state.filter === "all" ? "is-active" : ""}" data-filter="all">全部</button>
          <button class="chip ${state.filter === "loaded" ? "is-active" : ""}" data-filter="loaded">已装入</button>
          <button class="chip ${state.filter === "low" ? "is-active" : ""}" data-filter="low">低余量</button>
        </div>
        <div class="toolbar-actions">
          <button class="icon-button" aria-label="筛选">
            <i class="ph ph-funnel"></i>
          </button>
          <button class="icon-button" aria-label="网格视图">
            <i class="ph ph-grid-four"></i>
          </button>
        </div>
      </section>

      <section class="spool-grid" aria-label="耗材列表">
        ${
          filtered.length
            ? filtered.map(renderSpoolCard).join("")
            : `<div class="empty-state">
                <div>
                  <i class="ph ph-tray"></i>
                  <strong>没有匹配的耗材</strong>
                  <span>换一个搜索词或筛选条件</span>
                </div>
              </div>`
        }
      </section>
    </div>
  `;
}

function renderSpoolCard(spool) {
  const percent = Math.round((spool.remaining / spool.total) * 100);
  return `
    <article class="spool-card" data-spool-id="${spool.id}" tabindex="0" aria-label="${spool.name}，剩余 ${spool.remaining} 克">
      <div class="spool-swatch" style="--swatch:${spool.color}"></div>
      <div class="spool-card-body">
        <div class="spool-card-head">
          <div>
            <h3>${spool.name}</h3>
            <p class="subline">${spool.brand} · ${spool.type}</p>
          </div>
          <button class="card-menu" aria-label="更多操作">
            <i class="ph ph-dots-three"></i>
          </button>
        </div>
        <div class="meta-line">
          <i class="ph ph-cloud-check"></i>
          <span class="meta-location">${locationText(spool)}</span>
          <span class="mode-pill ${spool.mode === "RFID" ? "is-rfid" : ""}">
            <i class="ph ${spool.mode === "RFID" ? "ph-rfid" : "ph-note-pencil"}"></i>
            ${spool.mode}
          </span>
        </div>
        <div class="metric-row">
          <strong>${spool.remaining}</strong>
          <span>g</span>
          <span class="percent">${percent}%</span>
        </div>
        <div class="progress-track" aria-hidden="true">
          <span style="width:${percent}%"></span>
        </div>
      </div>
    </article>
  `;
}

function renderWeigh() {
  const spool = selectedSpool();
  if (state.gross == null) {
    state.gross = spool.remaining + state.tare + state.extra;
  }
  const net = Math.max(0, Number(state.gross) - state.tare - state.extra);

  viewRoot.innerHTML = `
    <div class="content-grid">
      <section class="section-intro">
        <div>
          <h2>${spool.name}</h2>
          <p>整盘称重后自动扣除料盘皮重和其他重量</p>
        </div>
        <span class="inline-status"><i class="ph ph-cloud-check"></i>云端已连接</span>
      </section>

      <section class="form-panel">
        <div class="field-stack">
          <div class="field">
            <label for="gross-input">整盘总重</label>
            <input class="text-input weight-input" id="gross-input" type="number" inputmode="decimal" value="${state.gross ?? spool.remaining + state.tare + state.extra}" />
          </div>

          <div class="preset-block">
            <span class="field-label">空盘皮重</span>
            <div class="preset-row">
              ${[200, 220, 250, 280]
                .map(
                  (value) =>
                    `<button class="preset ${state.tare === value ? "is-active" : ""}" data-preset="tare" data-value="${value}">${value} g</button>`,
                )
                .join("")}
              <button class="preset" data-add-preset="tare">自定义</button>
            </div>
          </div>

          <div class="preset-block">
            <span class="field-label">其他重量</span>
            <div class="preset-row">
              ${[0, 20, 50, 100]
                .map(
                  (value) =>
                    `<button class="preset ${state.extra === value ? "is-active" : ""}" data-preset="extra" data-value="${value}">${value === 0 ? "无" : `${value} g`}</button>`,
                )
                .join("")}
              <button class="preset" data-add-preset="extra">自定义</button>
            </div>
          </div>

          <div class="result-panel">
            <div>
              <span>写回拓竹云</span>
              <div class="inline-status">Studio 与 Handy 同步显示</div>
            </div>
            <div>
              <strong id="net-result">${Math.round(net)}</strong>
              <small>g</small>
            </div>
          </div>

          <div class="form-actions">
            <button class="primary-button" data-action="save-weigh">
              <i class="ph ph-check"></i>
              保存并同步
            </button>
          </div>
        </div>
      </section>

      <aside class="summary-panel">
        <div class="summary-swatch" style="--swatch:${spool.color}"></div>
        <h3>${spool.name}</h3>
        <p class="summary-sub">${spool.brand} · ${spool.type}</p>
        <div class="summary-list">
          <div class="summary-item"><span>当前云端值</span><strong>${spool.remaining} g</strong></div>
          <div class="summary-item"><span>标称净重</span><strong>${spool.total} g</strong></div>
          <div class="summary-item"><span>安装位置</span><strong>${locationText(spool)}</strong></div>
          <div class="summary-item"><span>识别方式</span><strong>${spool.mode}</strong></div>
        </div>
      </aside>
    </div>
  `;

  const grossInput = document.querySelector("#gross-input");
  grossInput.addEventListener("input", () => {
    state.gross = Number(grossInput.value);
    updateNetResult(spool);
  });
}

function updateNetResult(spool) {
  const gross = Number(state.gross || spool.remaining + state.tare + state.extra);
  const net = Math.max(0, gross - state.tare - state.extra);
  const result = document.querySelector("#net-result");
  if (result) result.textContent = String(Math.round(net));
}

function renderEdit() {
  const spool = selectedSpool();
  viewRoot.innerHTML = `
    <div class="content-grid">
      <section class="section-intro">
        <div>
          <h2>${spool.name}</h2>
          <p>编辑品牌、类型、颜色和备注，选项默认同步 Bambu Studio</p>
        </div>
        <span class="inline-status"><i class="ph ph-warning-circle"></i>RFID 原始字段由全局设置控制</span>
      </section>

      <section class="form-panel">
        <div class="field-stack">
          <div class="field">
            <label for="edit-name">名称</label>
            <input class="text-input" id="edit-name" value="${spool.name}" />
          </div>

          <div class="field">
            <label>品牌</label>
            <div class="preset-row">
              <button class="preset is-active">Bambu Lab</button>
              <button class="preset">SUNLU</button>
              <button class="preset">Polymaker</button>
              <button class="preset">自定义</button>
            </div>
          </div>

          <div class="field">
            <label>类型</label>
            <div class="preset-row">
              <button class="preset is-active">${spool.material}</button>
              <button class="preset">PETG</button>
              <button class="preset">ABS</button>
              <button class="preset">TPU</button>
            </div>
            <div class="option-preview hidden-options ${state.hiddenOpen ? "is-open" : ""}" id="hidden-options">
              <span class="option-token">PLA-CF</span>
              <span class="option-token">PA</span>
              <span class="option-token">PC</span>
              <span class="option-token">Support</span>
            </div>
            <button class="text-button" data-action="toggle-hidden">${state.hiddenOpen ? "收起隐藏选项" : "加载更多"}</button>
          </div>

          <div class="field">
            <label>颜色</label>
            <div class="preset-row">
              <button class="preset is-active"><span class="mini-swatch" style="--swatch:${spool.color}; width:20px; height:20px; border-radius:6px"></span>${spool.color}</button>
              <button class="preset">官方色卡</button>
              <button class="preset">自定义颜色</button>
            </div>
          </div>

          <div class="field">
            <label for="edit-note">备注</label>
            <textarea class="note-input" id="edit-note" maxlength="50">${spool.note}</textarea>
          </div>

          <div class="form-actions">
            <button class="primary-button" data-action="save-edit">
              <i class="ph ph-check"></i>
              保存修改
            </button>
          </div>
        </div>
      </section>

      <aside class="summary-panel">
        <div class="summary-swatch" style="--swatch:${spool.color}"></div>
        <h3>${spool.name}</h3>
        <p class="summary-sub">${spool.brand} · ${spool.type}</p>
        <div class="summary-list">
          <div class="summary-item"><span>剩余净重</span><strong>${spool.remaining} g</strong></div>
          <div class="summary-item"><span>云端名称</span><strong>${spool.name}</strong></div>
          <div class="summary-item"><span>显示状态</span><strong>常用选项</strong></div>
          <div class="summary-item"><span>同步方式</span><strong>写入云端</strong></div>
        </div>
      </aside>
    </div>
  `;
}

function typeOptionsForBrand(brand) {
  return filamentCatalog[brand]?.types || [state.selectedType];
}

function visibleStringOptions(options, commonCount, expanded, selected) {
  if (expanded) return options;
  const visible = options.slice(0, commonCount);
  if (selected && !visible.includes(selected)) visible.push(selected);
  return visible;
}

function visibleColorOptions(options, expanded, selectedHex) {
  if (expanded) return options;
  const visible = options.slice(0, 6);
  if (
    selectedHex &&
    !visible.some((color) => color.hex.toUpperCase() === selectedHex.toUpperCase())
  ) {
    const selected = options.find(
      (color) => color.hex.toUpperCase() === selectedHex.toUpperCase(),
    );
    if (selected) visible.push(selected);
  }
  return visible;
}

function openSpoolModal(id, tab = "basic") {
  const spool = spools.find((item) => item.id === id);
  if (!spool) return;
  state.modalId = id;
  state.selectedId = id;
  state.modalTab = tab;
  state.dropdown = null;
  state.expandedOptions = { brand: false, type: false, color: false };
  state.selectedBrand = spool.brand;
  state.selectedType = spool.type;
  state.selectedColorHex = spool.color.toUpperCase();
  state.selectedColor =
    bambuColors.find((color) => color.hex.toUpperCase() === spool.color.toUpperCase())?.name ||
    "自定义颜色";
  state.gross = spool.remaining + state.tare + state.extra;
  renderSpoolModal();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  modalBackdrop.classList.add("is-open");
}

function closeSpoolModal() {
  state.modalId = null;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  modalBackdrop.classList.remove("is-open");
}

function renderSpoolModal() {
  const spool = spools.find((item) => item.id === state.modalId);
  if (!spool) return;

  const percent = Math.round((spool.remaining / spool.total) * 100);
  const gross = Number(state.gross ?? spool.remaining + state.tare + state.extra);
  const net = Math.max(0, gross - state.tare - state.extra);
  const basicTab = state.modalTab === "basic";
  const typeOptions = typeOptionsForBrand(state.selectedBrand);
  const visibleBrands = visibleStringOptions(
    brandOptions,
    2,
    state.expandedOptions.brand,
    state.selectedBrand,
  );
  const visibleTypes = visibleStringOptions(
    typeOptions,
    2,
    state.expandedOptions.type,
    state.selectedType,
  );
  const visibleColors = visibleColorOptions(
    bambuColors,
    state.expandedOptions.color,
    state.selectedColorHex,
  );
  const selectedTare =
    spoolTarePresets.find((preset) => preset.id === state.tarePresetId) ||
    spoolTarePresets[0];
  const selectedExtra =
    extraWeightPresets.find((preset) => preset.id === state.extraPresetId) ||
    extraWeightPresets[0];

  modalContent.innerHTML = `
    <div class="modal-content">
      <div class="modal-head">
        <div class="modal-identity">
          <span class="modal-swatch" style="--swatch:${spool.color}"></span>
          <div>
            <h2>${spool.name}</h2>
            <p>${spool.brand} · ${spool.type}</p>
          </div>
        </div>
        <button class="icon-button" data-action="close-modal" aria-label="关闭耗材弹窗">
          <i class="ph ph-x"></i>
        </button>
      </div>

      <div class="modal-tabs" role="tablist" aria-label="耗材编辑">
        <button class="modal-tab ${basicTab ? "is-active" : ""}" data-modal-tab="basic" role="tab" aria-selected="${basicTab}">
          <i class="ph ph-note-pencil"></i>
          基本信息
        </button>
        <button class="modal-tab ${!basicTab ? "is-active" : ""}" data-modal-tab="weight" role="tab" aria-selected="${!basicTab}">
          <i class="ph ph-scales"></i>
          重量
        </button>
      </div>

      <div class="modal-body">
        ${
          basicTab
            ? `
              <div class="modal-grid">
                <div class="field field-full">
                  <label for="modal-name">名称</label>
                  <input class="text-input" id="modal-name" value="${spool.name}" />
                </div>
                <div class="field">
                  <span class="field-label">品牌</span>
                  <div class="select-field">
                    <button class="select-trigger ${state.dropdown === "brand" ? "is-open" : ""}" data-dropdown-toggle="brand">
                      <span class="select-trigger-copy">
                        <small>Bambu Studio 品牌</small>
                        <strong>${state.selectedBrand}</strong>
                      </span>
                      <i class="ph ph-caret-down"></i>
                    </button>
                    ${
                      state.dropdown === "brand"
                        ? `<div class="select-menu">
                            ${visibleBrands
                              .map(
                                (brand) => `
                                  <button class="select-option ${brand === state.selectedBrand ? "is-selected" : ""}" data-select-brand="${brand}">
                                    ${brand}
                                    <i class="ph ph-check option-check"></i>
                                  </button>`,
                              )
                              .join("")}
                            ${
                              !state.expandedOptions.brand && brandOptions.length > visibleBrands.length
                                ? `<button class="select-more" data-expand-options="brand">加载更多</button>`
                                : ""
                            }
                          </div>`
                        : ""
                    }
                  </div>
                </div>
                <div class="field">
                  <span class="field-label">类型</span>
                  <div class="select-field">
                    <button class="select-trigger ${state.dropdown === "type" ? "is-open" : ""}" data-dropdown-toggle="type">
                      <span class="select-trigger-copy">
                        <small>Bambu Studio 材料</small>
                        <strong>${state.selectedType}</strong>
                      </span>
                      <i class="ph ph-caret-down"></i>
                    </button>
                    ${
                      state.dropdown === "type"
                        ? `<div class="select-menu">
                            ${visibleTypes
                              .map(
                                (type) => `
                                  <button class="select-option ${type === state.selectedType ? "is-selected" : ""}" data-select-type="${type}">
                                    ${type}
                                    <i class="ph ph-check option-check"></i>
                                  </button>`,
                              )
                              .join("")}
                            ${
                              !state.expandedOptions.type && typeOptions.length > visibleTypes.length
                                ? `<button class="select-more" data-expand-options="type">加载更多</button>`
                                : ""
                            }
                          </div>`
                        : ""
                    }
                  </div>
                </div>
                <div class="field field-full">
                  <span class="field-label">颜色</span>
                  <div class="select-field">
                    <button class="select-trigger ${state.dropdown === "color" ? "is-open" : ""}" data-dropdown-toggle="color">
                      <span class="select-trigger-copy">
                        <small>${state.selectedBrand === "Bambu Lab" ? "Bambu Studio 官方色" : "通用色与自定义"}</small>
                        <strong>${state.selectedColor}</strong>
                      </span>
                      <span class="color-option-swatch" style="--swatch:${state.selectedColorHex}"></span>
                      <i class="ph ph-caret-down"></i>
                    </button>
                    ${
                      state.dropdown === "color"
                        ? `<div class="select-menu">
                            <div class="select-color-grid">
                              ${visibleColors
                                .map(
                                  (color) => `
                                    <button class="color-option ${color.hex.toUpperCase() === state.selectedColorHex ? "is-selected" : ""}" data-select-color="${color.hex}" data-color-name="${color.name}">
                                      <span class="color-option-swatch" style="--swatch:${color.hex}"></span>
                                      ${color.name}
                                    </button>`,
                                )
                                .join("")}
                            </div>
                            ${
                              !state.expandedOptions.color && bambuColors.length > visibleColors.length
                                ? `<button class="select-more" data-expand-options="color">加载更多</button>`
                                : ""
                            }
                            <button class="select-more" data-custom-color>自定义颜色</button>
                          </div>`
                        : ""
                    }
                  </div>
                </div>
                <div class="field field-full">
                  <label for="modal-note">备注</label>
                  <textarea class="note-input" id="modal-note" maxlength="50">${spool.note}</textarea>
                </div>
              </div>
            `
            : `
              <div class="modal-weight-hero">
                <div>
                  <span>当前剩余</span>
                  <div class="inline-status">${locationText(spool)}</div>
                </div>
                <div>
                  <strong>${spool.remaining}</strong>
                  <small>g / ${spool.total} g</small>
                </div>
              </div>
              <div class="field-stack">
                <div class="field">
                  <label for="modal-gross">整盘总重</label>
                  <input class="text-input weight-input" id="modal-gross" type="number" inputmode="decimal" value="${gross}" />
                </div>
                <div class="field">
                  <span class="field-label">空盘皮重</span>
                  <div class="select-field">
                    <button class="select-trigger ${state.dropdown === "tare" ? "is-open" : ""}" data-dropdown-toggle="tare">
                      <span class="select-trigger-copy">
                        <small>料盘预设</small>
                        <strong>${selectedTare.name}</strong>
                      </span>
                      <span class="select-value">${selectedTare.grams} g</span>
                      <i class="ph ph-caret-down"></i>
                    </button>
                    ${
                      state.dropdown === "tare"
                        ? `<div class="select-menu">
                            ${spoolTarePresets
                              .map(
                                (preset) => `
                                  <button class="select-option ${preset.id === state.tarePresetId ? "is-selected" : ""}" data-select-tare="${preset.id}">
                                    <span>${preset.name}</span>
                                    <span class="select-option-meta">${preset.grams} g</span>
                                    <i class="ph ph-check option-check"></i>
                                  </button>`,
                              )
                              .join("")}
                            <button class="select-more" data-custom-weight="tare">自定义重量</button>
                          </div>`
                        : ""
                    }
                  </div>
                </div>
                <div class="field">
                  <span class="field-label">其他重量</span>
                  <div class="select-field">
                    <button class="select-trigger ${state.dropdown === "extra" ? "is-open" : ""}" data-dropdown-toggle="extra">
                      <span class="select-trigger-copy">
                        <small>配重或附件</small>
                        <strong>${selectedExtra.name}</strong>
                      </span>
                      <span class="select-value">${selectedExtra.grams} g</span>
                      <i class="ph ph-caret-down"></i>
                    </button>
                    ${
                      state.dropdown === "extra"
                        ? `<div class="select-menu">
                            ${extraWeightPresets
                              .map(
                                (preset) => `
                                  <button class="select-option ${preset.id === state.extraPresetId ? "is-selected" : ""}" data-select-extra="${preset.id}">
                                    <span>${preset.name}</span>
                                    <span class="select-option-meta">${preset.grams} g</span>
                                    <i class="ph ph-check option-check"></i>
                                  </button>`,
                              )
                              .join("")}
                            <button class="select-more" data-custom-weight="extra">自定义重量</button>
                          </div>`
                        : ""
                    }
                  </div>
                </div>
                <div class="result-panel">
                  <div>
                    <span>写回拓竹云</span>
                    <div class="inline-status">Studio 与 Handy 同步显示</div>
                  </div>
                  <div>
                    <strong id="modal-net-result">${Math.round(net)}</strong>
                    <small>g</small>
                  </div>
                </div>
              </div>
            `
        }
      </div>

      <div class="modal-footer">
        <span class="modal-footer-note">${basicTab ? "名称和备注始终同时写入" : `当前进度 ${percent}%`}</span>
        <button class="primary-button" data-action="${basicTab ? "save-basic" : "save-weight"}">
          <i class="ph ph-check"></i>
          ${basicTab ? "保存信息" : "保存重量"}
        </button>
      </div>
    </div>
  `;

  if (!basicTab) {
    const grossInput = document.querySelector("#modal-gross");
    grossInput.addEventListener("input", () => {
      state.gross = Number(grossInput.value);
      updateModalNetResult();
    });
  }
}

function updateModalNetResult() {
  const result = document.querySelector("#modal-net-result");
  if (!result) return;
  const spool = spools.find((item) => item.id === state.modalId);
  if (!spool) return;
  const gross = Number(state.gross ?? spool.remaining + state.tare + state.extra);
  result.textContent = String(Math.round(Math.max(0, gross - state.tare - state.extra)));
}

function renderSettings() {
  viewRoot.innerHTML = `
    <div class="content-grid">
      <section class="section-intro">
        <div>
          <h2>本地偏好</h2>
          <p>本地偏好可通过 JSON 导入导出，不包含账号令牌</p>
        </div>
        <button class="primary-button" data-action="save-settings">
          <i class="ph ph-check"></i>
          保存设置
        </button>
      </section>

      <section class="settings-grid">
        <article class="settings-card">
          <h3>RFID 编辑</h3>
          <p>该开关对全部 RFID 料盘生效</p>
          <div class="settings-card-body">
            <div class="setting-row">
              <div class="setting-copy">
                <strong>强制修改 RFID 字段</strong>
                <span>开启后直接覆盖品牌、类型和颜色</span>
              </div>
              <label class="switch">
                <input type="checkbox" id="force-rfid" ${state.forceRfid ? "checked" : ""} />
                <span class="switch-track"></span>
              </label>
            </div>
          </div>
        </article>

        <article class="settings-card">
          <h3>JSON 偏好</h3>
          <p>在设备间迁移皮重、选项和显示偏好</p>
          <div class="settings-card-body">
            <div class="data-actions">
              <button class="secondary-button" data-action="import-json">
                <i class="ph ph-file-arrow-down"></i>
                导入 JSON
              </button>
              <button class="secondary-button" data-action="export-json">
                <i class="ph ph-file-arrow-up"></i>
                导出 JSON
              </button>
            </div>
            <div class="settings-divider"></div>
            <div class="settings-split">
              <div class="settings-option">
                <strong>合并导入</strong>
                <span>保留现有配置</span>
              </div>
              <div class="settings-option">
                <strong>完整替换</strong>
                <span>使用文件覆盖本机</span>
              </div>
            </div>
          </div>
        </article>

        <article class="settings-card">
          <h3>皮重预设</h3>
          <p>称重页只显示已启用的常用预设</p>
          <div class="settings-card-body">
            <div class="settings-option-list">
              <div class="settings-option-row">
                <div>
                  <strong>Bambu Lab 空盘</strong>
                  <span>160 g · 默认</span>
                </div>
              </div>
              <div class="settings-option-row">
                <div>
                  <strong>SUNLU 空盘</strong>
                  <span>200 g</span>
                </div>
              </div>
              <div class="settings-option-row">
                <div>
                  <strong>eSUN 空盘</strong>
                  <span>220 g</span>
                </div>
              </div>
            </div>
            <div class="settings-divider"></div>
            <div class="setting-row">
              <div class="setting-copy">
                <strong>默认其他重量</strong>
                <span>无 · 0 g</span>
              </div>
              <button class="secondary-button" data-action="manage-extra-weight">管理</button>
            </div>
          </div>
        </article>

        <article class="settings-card">
          <h3>常用选项</h3>
          <p>编辑耗材时优先展示常用项，其余通过加载更多展开</p>
          <div class="settings-card-body">
            <div class="settings-option-list">
              <div class="settings-option-row">
                <div>
                  <strong>品牌</strong>
                  <span>常用 2 / 共 6</span>
                </div>
                <button class="secondary-button" data-action="manage-options">管理</button>
              </div>
              <div class="settings-option-row">
                <div>
                  <strong>类型</strong>
                  <span>常用 2 / 共 12</span>
                </div>
                <button class="secondary-button" data-action="manage-options">管理</button>
              </div>
              <div class="settings-option-row">
                <div>
                  <strong>颜色</strong>
                  <span>常用 6 / 共 14</span>
                </div>
                <button class="secondary-button" data-action="manage-options">管理</button>
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>
  `;

  const forceToggle = document.querySelector("#force-rfid");
  forceToggle.addEventListener("change", () => {
    state.forceRfid = forceToggle.checked;
  });
}

function renderLogin() {
  viewRoot.innerHTML = `
    <section class="login-view">
      <div class="login-copy">
        <a class="brand" href="?view=library">
          <span class="brand-mark"><i class="ph ph-cube"></i></span>
          <span>余量</span>
        </a>
        <h2>连接你的<br />耗材库</h2>
        <p>读取云端料盘，称重后直接写回 Bambu Studio 与 Bambu Handy。</p>
      </div>

      <div class="login-panel glass-panel">
        <h3>使用 Bambu 账号登录</h3>
        <p>登录态由 Cloudflare Worker 通过 HttpOnly Cookie 保存</p>
        <div class="segmented" aria-label="账号地区">
          <button class="${state.region === "china" ? "is-active" : ""}" data-region="china">中国大陆</button>
          <button class="${state.region === "global" ? "is-active" : ""}" data-region="global">国际区</button>
        </div>
        <div class="login-form">
          <div class="field">
            <label for="login-email">Bambu 账号</label>
            <input class="text-input" id="login-email" type="email" placeholder="邮箱或手机号" />
          </div>
          <div class="field">
            <label for="login-password">密码</label>
            <input class="text-input" id="login-password" type="password" placeholder="输入 Bambu 密码" />
          </div>
          <button class="primary-button" data-action="login">
            <i class="ph ph-arrow-right"></i>
            登录并读取
          </button>
        </div>
        <p class="login-note">原型仅展示界面状态，不会提交账号信息。</p>
      </div>
    </section>
  `;
}

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-view]");
  if (nav) {
    event.preventDefault();
    setView(nav.dataset.view);
    return;
  }

  const filter = event.target.closest("[data-filter]");
  if (filter) {
    state.filter = filter.dataset.filter;
    renderLibrary();
    return;
  }

  const card = event.target.closest(".spool-card");
  if (card && !event.target.closest(".card-menu")) {
    openSpoolModal(Number(card.dataset.spoolId));
    return;
  }

  const openSpool = event.target.closest("[data-open-spool]");
  if (openSpool) {
    openSpoolModal(Number(openSpool.dataset.openSpool));
    return;
  }

  const region = event.target.closest("[data-region]");
  if (region) {
    state.region = region.dataset.region;
    renderLogin();
    return;
  }

  const dropdownToggle = event.target.closest("[data-dropdown-toggle]");
  if (dropdownToggle) {
    const field = dropdownToggle.dataset.dropdownToggle;
    state.dropdown = state.dropdown === field ? null : field;
    renderSpoolModal();
    return;
  }

  const brandOption = event.target.closest("[data-select-brand]");
  if (brandOption) {
    state.selectedBrand = brandOption.dataset.selectBrand;
    state.selectedType = typeOptionsForBrand(state.selectedBrand)[0];
    state.dropdown = null;
    renderSpoolModal();
    return;
  }

  const typeOption = event.target.closest("[data-select-type]");
  if (typeOption) {
    state.selectedType = typeOption.dataset.selectType;
    state.dropdown = null;
    renderSpoolModal();
    return;
  }

  const colorOption = event.target.closest("[data-select-color]");
  if (colorOption) {
    state.selectedColorHex = colorOption.dataset.selectColor.toUpperCase();
    state.selectedColor = colorOption.dataset.colorName;
    state.dropdown = null;
    renderSpoolModal();
    return;
  }

  const expandOptions = event.target.closest("[data-expand-options]");
  if (expandOptions) {
    state.expandedOptions[expandOptions.dataset.expandOptions] = true;
    renderSpoolModal();
    return;
  }

  if (event.target.closest("[data-custom-color]")) {
    state.selectedColor = "自定义颜色";
    state.dropdown = null;
    renderSpoolModal();
    showToast("自定义颜色入口已打开");
    return;
  }

  const tareOption = event.target.closest("[data-select-tare]");
  if (tareOption) {
    const preset = spoolTarePresets.find(
      (item) => item.id === tareOption.dataset.selectTare,
    );
    if (preset) {
      state.tarePresetId = preset.id;
      state.tare = preset.grams;
    }
    state.dropdown = null;
    renderSpoolModal();
    return;
  }

  const extraOption = event.target.closest("[data-select-extra]");
  if (extraOption) {
    const preset = extraWeightPresets.find(
      (item) => item.id === extraOption.dataset.selectExtra,
    );
    if (preset) {
      state.extraPresetId = preset.id;
      state.extra = preset.grams;
    }
    state.dropdown = null;
    renderSpoolModal();
    return;
  }

  if (event.target.closest("[data-custom-weight]")) {
    state.dropdown = null;
    renderSpoolModal();
    showToast("自定义重量入口已打开");
    return;
  }

  const modalTab = event.target.closest("[data-modal-tab]");
  if (modalTab) {
    state.modalTab = modalTab.dataset.modalTab;
    renderSpoolModal();
    return;
  }

  const preset = event.target.closest("[data-preset]");
  if (preset) {
    const value = Number(preset.dataset.value);
    state[preset.dataset.preset] = value;
    renderSpoolModal();
    return;
  }

  const addPreset = event.target.closest("[data-add-preset]");
  if (addPreset) {
    showToast("自定义重量入口已打开");
    return;
  }

  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;

  if (action === "refresh") showToast("耗材库已同步");
  if (action === "close-modal") closeSpoolModal();
  if (action === "save-basic") {
    const spool = spools.find((item) => item.id === state.modalId);
    if (spool) {
      spool.name = document.querySelector("#modal-name").value.trim() || spool.name;
      spool.brand = state.selectedBrand;
      spool.type = state.selectedType;
      spool.material = state.selectedType.split(" ")[0];
      spool.color = state.selectedColorHex;
      spool.note = document.querySelector("#modal-note").value.trim();
    }
    closeSpoolModal();
    renderLibrary();
    showToast("耗材信息已保存");
  }
  if (action === "save-weight") {
    const spool = spools.find((item) => item.id === state.modalId);
    if (spool) {
      spool.remaining = Math.round(
        Math.max(0, Number(state.gross || 0) - state.tare - state.extra),
      );
    }
    closeSpoolModal();
    renderLibrary();
    showToast("剩余重量已保存");
  }
  if (action === "save-settings") showToast("设置已保存");
  if (action === "manage-options") showToast("常用选项管理入口已打开");
  if (action === "manage-extra-weight") showToast("其他重量管理入口已打开");
  if (action === "export-json") showToast("偏好 JSON 已准备导出");
  if (action === "import-json") showToast("已打开 JSON 导入入口");
  if (action === "login") {
    showToast("登录成功后返回耗材库");
    setTimeout(() => setView("library"), 500);
  }
  if (action === "toggle-hidden") {
    state.hiddenOpen = !state.hiddenOpen;
    const panel = document.querySelector(
      "#modal-hidden-options, #hidden-options, #settings-hidden",
    );
    if (panel) panel.classList.toggle("is-open", state.hiddenOpen);
    const button = event.target.closest("[data-action]");
    button.textContent = state.hiddenOpen ? "收起隐藏选项" : "加载更多";
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.modalId) closeSpoolModal();
  const card = event.target.closest?.(".spool-card");
  if (card && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    openSpoolModal(Number(card.dataset.spoolId));
  }
});

searchInput.addEventListener("input", () => {
  state.query = searchInput.value;
  if (state.view === "library") renderLibrary();
});

modalBackdrop.addEventListener("click", closeSpoolModal);

pageTitle.textContent = viewTitles[state.view];
document.body.classList.toggle("auth-view", state.view === "login");
document.querySelectorAll(".nav-item").forEach((button) => {
  button.classList.toggle("is-active", button.dataset.view === state.view);
});
render();
