/* main.js
   - Fetches README.md from Skills-Certs
   - Converts markdown to HTML via marked.js
   - Rewrites relative image/link URLs to raw.githubusercontent / github blob
   - Caches the markdown in localStorage for 24h to reduce fetches
*/

// Config — edit if your repo changes
const repoOwner = 'TechLab-JD';
const repoName = 'Skills-Certs';
const branch = 'main';
const rawBase = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/`;
const blobBase = `https://github.com/${repoOwner}/${repoName}/blob/${branch}/`;
const readmeUrl = `${rawBase}README.md`;

const CACHE_KEY = 'skills_readme_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// On DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // set footer year
  document.getElementById('year').textContent = new Date().getFullYear();

  // smooth scroll only for same-page anchors (preserve default for mailto/external)
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', function(e){
      // only intercept if the href is an actual id on the page
      const selector = this.getAttribute('href');
      const target = document.querySelector(selector);
      if(target){
        e.preventDefault();
        target.scrollIntoView({behavior:'smooth', block:'start'});
        // update history without adding entry
        history.replaceState(null, '', selector);
      }
    });
  });

  loadReadme();
});

// Load README with cache
async function loadReadme(){
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if(cached){
      const obj = JSON.parse(cached);
      if(Date.now() - obj.t < CACHE_TTL){
        renderMarkdown(obj.md);
        return;
      }
    }

    const res = await fetch(readmeUrl, {cache: 'no-cache'});
    if(!res.ok){
      const txt = await res.text().catch(()=>res.statusText || '');
      throw new Error(`Failed to fetch README: ${res.status} ${res.statusText} ${txt}`);
    }
    const md = await res.text();
    localStorage.setItem(CACHE_KEY, JSON.stringify({t: Date.now(), md}));
    renderMarkdown(md);
  } catch(err) {
    console.error('README load error', err);
    document.getElementById('readme-content').innerHTML = `<p class="text-danger">Could not load skills list. <a href="https://github.com/${repoOwner}/${repoName}" target="_blank">View on GitHub</a></p>`;
  }
}

function renderMarkdown(md){
  const html = marked.parse(md || '');
  const container = document.getElementById('readme-content');
  container.innerHTML = html;
  rewriteRelativeUrls(container);
  sanitizeBadges(container);
}

// Convert relative img/link paths to raw/blob URLs
function rewriteRelativeUrls(container){
  // Use URL parsing to rewrite relative urls safely
  container.querySelectorAll('img').forEach(img=>{
    try{
      const src = img.getAttribute('src') || '';
      if(src && !/^https?:\/\//i.test(src) && !src.startsWith('data:')){
        const cleaned = src.replace(/^\.\//,'').replace(/^\//,'');
        img.src = rawBase + cleaned;
        img.setAttribute('loading','lazy');
        img.setAttribute('decoding','async');
      }
    }catch(e){ console.warn('img rewrite failed', e, img); }
  });
  container.querySelectorAll('a').forEach(a=>{
    try{
      const href = a.getAttribute('href') || '';
      if(href && !/^https?:\/\//i.test(href) && !href.startsWith('#') && !href.startsWith('mailto:')){
        const cleaned = href.replace(/^\.\//,'').replace(/^\//,'');
        a.href = blobBase + cleaned;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      } else if (/^https?:\/\//i.test(href)) {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
    }catch(e){ console.warn('link rewrite failed', e, a); }
  });
}

// Optional: small CSS classes for shields/badges if needed
function sanitizeBadges(container){
  // Example: force badge images to small height
  container.querySelectorAll('img').forEach(img=>{
    if(img.src.includes('shields.io') || img.src.includes('badge')){
      img.style.height = '20px';
      img.style.marginRight = '6px';
      img.style.verticalAlign = 'middle';
    }
  });
}
