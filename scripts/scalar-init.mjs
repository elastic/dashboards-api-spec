const apiReferenceContainer = document.getElementById("api-reference");
const specUrl = apiReferenceContainer?.dataset.specUrl;

const scalarCustomCss = ` .settingsButton, .sendButton, .agent-scalar,
      .agent-scalar-overlay, .agent-button-container,
      .ask-agent-scalar-input-label, .ask-agent-scalar-input,
      .ask-agent-scalar-send, [data-addressbar-action="send"],
      [data-testid="client-picker"], .gitbook-show, [role="search"],
      .sidebar-search-placeholder, .references-search-additional-actions,
      .reference-navigation-search, .search-input, .search-button,
      .download-button, .scalar-api-client, .app-exit-button,
      .scalar-mcp-layer-link, a[href="https://www.scalar.com"]
      { display: none !important; } `;

if (!window.Scalar || !apiReferenceContainer || !specUrl) {
  console.error("Scalar failed to load.");
} else {
  window.Scalar.createApiReference("#api-reference", {
    hideModels: true,
    agent: { disabled: true },
    customCss: scalarCustomCss,
    defaultOpenFirstTag: true,
    documentDownloadType: "none",
    generateTagSlug: (tag) => tag.name,
    hiddenClients: true,
    hideClientButton: true,
    hideDarkModeToggle: true,
    hideSearch: true,
    hideTestRequestButton: true,
    showDeveloperTools: "never",
    url: specUrl,
    withDefaultFonts: false,
  });
}
