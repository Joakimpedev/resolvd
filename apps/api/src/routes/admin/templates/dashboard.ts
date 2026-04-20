import { STYLES } from './styles.js';
import { SCRIPT } from './script.js';

export const DASHBOARD_HTML = `<!doctype html><html lang="no"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Resolvd admin</title>
<style>${STYLES}</style>
</head><body>
<div class="topbar">
  <h1>Re|solvd admin</h1>
  <nav>
    <button class="btn nav" data-open="companyModal">+ Bedrift</button>
    <button class="btn nav" data-open="userModal">+ Bruker</button>
    <button class="btn nav" data-open="articleModal">+ Artikkel</button>
    <button class="btn nav" data-open="courseModal">+ Kurs</button>
    <button class="btn nav" data-open="tagModal">+ Tag</button>
    <button class="btn nav" data-open="solutionModal">+ AI-løsning</button>
    <a href="#" id="signout" style="margin-left:8px;font-size:12px">Logg ut</a>
  </nav>
</div>

<div class="container">
  <div class="section">
    <h2>Brukere <span class="count" id="userCount">0</span></h2>
    <div class="search"><input type="search" id="userSearch" placeholder="Søk brukere..."></div>
    <table id="userTable"><thead><tr>
      <th>Navn</th><th>E-post</th><th>Passord</th><th>Rolle</th><th>Bedrift</th><th>Tags</th><th></th>
    </tr></thead><tbody></tbody></table>
  </div>

  <div class="section">
    <h2>Bedrifter <span class="count" id="compCount">0</span></h2>
    <table id="compTable"><thead><tr>
      <th>Navn</th><th>Brukere</th><th>Opprettet</th><th></th>
    </tr></thead><tbody></tbody></table>
  </div>

  <div class="section">
    <h2>Tags <span class="count" id="tagCount">0</span></h2>
    <table id="tagTable"><thead><tr>
      <th>Navn</th><th>Brukere</th><th>Artikler</th><th>Kurs</th><th></th>
    </tr></thead><tbody></tbody></table>
  </div>

  <div class="section">
    <h2>Artikler <span class="count" id="articleCount">0</span></h2>
    <div class="search"><input type="search" id="articleSearch" placeholder="Søk artikler..."></div>
    <table id="articleTable"><thead><tr>
      <th>Tittel</th><th>Kategori</th><th>Scope</th><th>Publisert</th><th></th>
    </tr></thead><tbody></tbody></table>
  </div>

  <div class="section">
    <h2>Kurs <span class="count" id="courseCount">0</span></h2>
    <table id="courseTable"><thead><tr>
      <th>Tittel</th><th>Moduler</th><th>Scope</th><th></th>
    </tr></thead><tbody></tbody></table>
  </div>

  <div class="section">
    <h2>Meldinger <span class="count" id="reqCount">0</span></h2>
    <table id="reqTable"><thead><tr>
      <th>Tittel</th><th>Bedrift</th><th>Fra</th><th>Status</th><th>Oppdatert</th>
    </tr></thead><tbody></tbody></table>
  </div>

  <div class="section">
    <h2>AI-løsninger <span class="count" id="solCount">0</span></h2>
    <table id="solTable"><thead><tr>
      <th>Navn</th><th>Bedrift</th><th>Status</th><th>Undertekst</th><th></th>
    </tr></thead><tbody></tbody></table>
  </div>
</div>

<!-- Modal overlays (a single overlay element we swap content into) -->
<div class="modal-overlay" id="overlay"><div class="modal" id="modalBox"></div></div>

<script>${SCRIPT}</script>
</body></html>`;
