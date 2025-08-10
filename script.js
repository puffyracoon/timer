let events = await fetch('events.json')
    .then(response => response.json())
    .then(obj => { return obj })
    .catch(error => console.error("Could not fetch event data: ", error));
// Alert sound element; will attempt to unlock on first user interaction
let alertSound = new Audio("assets/alert.mp3");
alertSound.preload = 'auto';
let alertSoundUnlocked = false;
function unlockAlertSoundOnce(){
    if (alertSoundUnlocked) return;
    const playPromise = alertSound.play();
    if (playPromise) {
        playPromise.then(()=>{ alertSound.pause(); alertSound.currentTime = 0; alertSoundUnlocked = true; })
            .catch(()=>{/* will retry on next interaction */});
    }
}
window.addEventListener('click', unlockAlertSoundOnce, { once:false });
window.addEventListener('keydown', unlockAlertSoundOnce, { once:false });
// Provide safe stub for analytics if umami not loaded
if (typeof window.umami === 'undefined') {
    window.umami = { track: (...args)=>console.debug('[umami stub]', ...args) };
}

const eventTable = document.getElementById("event-table")
const cardTemplate = document.getElementById("event-card-template")
const toggleTemplate = document.getElementById("tgl-template")
const categoryList = document.getElementById("category-list")
const categoryTemplate = document.getElementById("tgl-category-template")

// New UI control elements
const searchInput = document.getElementById("event-search")
const searchClear = document.getElementById("search-clear")
const toggleFavorites = document.getElementById("toggle-favorites")
const toggleAlerts = document.getElementById("toggle-alerts")

let allEvents = []
let currentSearchTerm = ""
let showOnlyFavorites = false
let showOnlyAlerts = false
let favoriteEvents = JSON.parse(localStorage.getItem('favorite-events') || '[]')

// Event Chain Detection
let enableChainAlerts = JSON.parse(localStorage.getItem('chain-alerts-enabled') || 'true')
let activeChains = new Map() // Track active chain alerts

// ---------- Procedural Background Generation (placed early to avoid TDZ) ----------
const proceduralBackgroundCache = {};
function applyProceduralBackground(cardElement, categoryKey){
    const cacheKey = `bg-${categoryKey}`;
    const userMode = localStorage.getItem('bg-style') || 'generated';
    if (userMode === 'plain') {
        cardElement.style.backgroundImage = 'none';
        return;
    }

    // localStorage persistence
    if (!proceduralBackgroundCache[cacheKey]) {
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
            proceduralBackgroundCache[cacheKey] = stored;
        }
    }
    if (proceduralBackgroundCache[cacheKey]) {
        cardElement.style.backgroundImage = `url(${proceduralBackgroundCache[cacheKey]})`;
        cardElement.style.backgroundSize = 'cover';
        cardElement.style.backgroundPosition = 'center';
        return;
    }

    const palettes = {
        general: ['#2b2f3a','#394152','#1d2229','#556070'],
        core: ['#331010','#5a1a16','#752520','#3d1614'],
        // Align Living World Season 1 with core red family (was purple earlier)
        ls1: ['#361111','#551a18','#7a2520','#461a18'],
        ls2: ['#3c3622','#6d602c','#9a8c45','#2a2518'],
        hot: ['#0d2e16','#124226','#1f5c35','#08351b'],
        ls3: ['#0b3a2f','#145245','#1b6a5b','#094137'],
        pof: ['#4a2410','#7a3a18','#b65825','#5a2e14'],
        ls4: ['#26163f','#3d2363','#552f8b','#180d2b'],
        ls5: ['#0d2347','#12315f','#1b4685','#08162b'],
        eod: ['#0b2a2f','#114149','#16606b','#072125'],
        soto: ['#3e3409','#5e4c0f','#7d6313','#271f05'],
        janthir: ['#1c2d35','#2b4754','#375b6b','#122027'],
        Festivals: ['#3c1d04','#5e2c07','#8a420d','#281203']
    };
    const colors = palettes[categoryKey] || ['#1d1d1f','#2a2a2d','#333336','#232326'];

    const canvas = document.createElement('canvas');
    canvas.width = 480; canvas.height = 180;
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0,0,0,canvas.height);
    g.addColorStop(0, colors[0]); g.addColorStop(1, colors[3]);
    ctx.fillStyle = g; ctx.fillRect(0,0,canvas.width,canvas.height);

    const layerCount = 5;
    for (let l=0; l<layerCount; l++) {
        ctx.globalAlpha = 0.08 + (l/layerCount)*0.05;
        ctx.fillStyle = colors[(l+1)%colors.length];
        ctx.beginPath();
        const peaks = 6 + Math.floor(Math.random()*4);
        const yBase = canvas.height * (0.3 + 0.6*(l/layerCount));
        ctx.moveTo(0, canvas.height);
        for (let i=0;i<=peaks;i++){
            const x = (i/peaks) * canvas.width;
            const y = yBase + Math.sin(i + Math.random()*0.8)*18*(1-l/layerCount);
            ctx.lineTo(x,y);
        }
        ctx.lineTo(canvas.width, canvas.height); ctx.closePath(); ctx.fill();
    }

    ctx.globalAlpha = 0.12;
    for (let i=0;i<40;i++){
        const r = 2 + Math.random()*3;
        const x = Math.random()*canvas.width;
        const y = Math.random()*canvas.height*0.7;
        const grd = ctx.createRadialGradient(x,y,0,x,y,r);
        grd.addColorStop(0, 'rgba(255,255,255,0.35)');
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    }

    const noiseDensity = 0.04;
    const imgData = ctx.getImageData(0,0,canvas.width,canvas.height);
    const data = imgData.data;
    for (let p=0; p<data.length; p+=4){
        if (Math.random() < noiseDensity) {
            const n = (Math.random()*45)|0;
            data[p]+=n; data[p+1]+=n; data[p+2]+=n;
        }
    }
    ctx.putImageData(imgData,0,0);
    const url = canvas.toDataURL('image/webp', 0.7);
    proceduralBackgroundCache[cacheKey] = url;
    try { localStorage.setItem(cacheKey, url); } catch(e) { /* ignore quota */ }
    cardElement.style.backgroundImage = `url(${url})`;
    cardElement.style.backgroundSize = 'cover';
    cardElement.style.backgroundPosition = 'center';
}

// Search functionality
searchInput.addEventListener('input', (e) => {
    currentSearchTerm = e.target.value.toLowerCase()
    if (currentSearchTerm) {
        searchClear.classList.add('visible')
    } else {
        searchClear.classList.remove('visible')
    }
    filterEvents()
})

searchClear.addEventListener('click', () => {
    searchInput.value = ''
    currentSearchTerm = ''
    searchClear.classList.remove('visible')
    filterEvents()
})

// Favorites toggle
toggleFavorites.addEventListener('click', () => {
    showOnlyFavorites = !showOnlyFavorites
    if (showOnlyFavorites) {
        toggleFavorites.classList.add('active')
        // Deactivate alerts filter if both would be active
        if (showOnlyAlerts) {
            showOnlyAlerts = false
            toggleAlerts.classList.remove('active')
        }
    } else {
        toggleFavorites.classList.remove('active')
    }
    filterEvents()
})

// Alerts toggle
toggleAlerts.addEventListener('click', () => {
    showOnlyAlerts = !showOnlyAlerts
    if (showOnlyAlerts) {
        toggleAlerts.classList.add('active')
        // Deactivate favorites filter if both would be active
        if (showOnlyFavorites) {
            showOnlyFavorites = false
            toggleFavorites.classList.remove('active')
        }
    } else {
        toggleAlerts.classList.remove('active')
    }
    filterEvents()
})

// API section collapse
const apiHeader = document.getElementById('api-header')
const apiContent = document.getElementById('api-content')
const collapseArrow = apiHeader.querySelector('.collapse-arrow')

// Load API collapse state
const isApiCollapsed = localStorage.getItem('api-collapsed') === 'true'
if (isApiCollapsed) {
    apiContent.classList.add('collapsed')
    collapseArrow.classList.add('collapsed')
}

apiHeader.addEventListener('click', () => {
    const isCurrentlyCollapsed = apiContent.classList.contains('collapsed')
    
    if (isCurrentlyCollapsed) {
        apiContent.classList.remove('collapsed')
        collapseArrow.classList.remove('collapsed')
        localStorage.removeItem('api-collapsed')
    } else {
        apiContent.classList.add('collapsed')
        collapseArrow.classList.add('collapsed')
        localStorage.setItem('api-collapsed', 'true')
    }
})

// Notification permission request
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
}

// Chain alerts toggle
const chainToggle = document.getElementById('chain-alerts-toggle')
chainToggle.addEventListener('click', toggleChainAlerts)

// FAQ sidebar functionality
const faqToggle = document.getElementById('faq-toggle')
const faqSidebar = document.getElementById('faq-sidebar')
const faqOverlay = document.getElementById('faq-overlay')
const faqClose = document.getElementById('faq-close')

function openFAQ() {
    faqSidebar.classList.add('open')
    faqOverlay.classList.add('open')
    faqToggle.classList.add('active')
}

function closeFAQ() {
    faqSidebar.classList.remove('open')
    faqOverlay.classList.remove('open')
    faqToggle.classList.remove('active')
}

faqToggle.addEventListener('click', openFAQ)
faqClose.addEventListener('click', closeFAQ)
faqOverlay.addEventListener('click', closeFAQ)

// Close FAQ with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && faqSidebar.classList.contains('open')) {
        closeFAQ()
    }
})

// Category control buttons
const selectAllBtn = document.getElementById('select-all-categories')
const selectNoneBtn = document.getElementById('select-none-categories')

selectAllBtn.addEventListener('click', () => {
    selectAllCategories()
})

selectNoneBtn.addEventListener('click', () => {
    selectNoneCategories()
})

function selectAllCategories() {
    const categoryCheckboxes = document.querySelectorAll('.category-checkbox')
    categoryCheckboxes.forEach(checkbox => {
        if (!checkbox.checked) {
            checkbox.checked = true
            checkbox.dispatchEvent(new Event('change'))
        }
    })
    showToast('All categories selected')
}

function selectNoneCategories() {
    const categoryCheckboxes = document.querySelectorAll('.category-checkbox')
    categoryCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            checkbox.checked = false
            checkbox.dispatchEvent(new Event('change'))
        }
    })
    showToast('All categories deselected')
}

// Initialize chain toggle UI
updateChainToggleUI()

function filterEvents() {
    const eventCards = document.querySelectorAll('.event-card-element')
    eventCards.forEach(card => {
        const titleEl = card.querySelector('.event-title')
        const mapEl = card.querySelector('.event-map')
        if (!titleEl || !mapEl) { return } // skip malformed cards
        const eventName = titleEl.childNodes[0] ? titleEl.childNodes[0].textContent.toLowerCase() : titleEl.textContent.toLowerCase()
        const eventMap = mapEl.textContent.toLowerCase()
        const isFavorite = card.querySelector('.favorite-star').classList.contains('favorited')
        
        // Check if event has active alerts (reminder set)
    const reminderElement = card.querySelector('.reminder-link')
    const hasActiveAlert = reminderElement && /^(2m|5m|10m)$/.test(reminderElement.textContent.trim())
        
        const matchesSearch = !currentSearchTerm || 
            eventName.includes(currentSearchTerm) || 
            eventMap.includes(currentSearchTerm)
        
        const matchesFavoriteFilter = !showOnlyFavorites || isFavorite
        const matchesAlertsFilter = !showOnlyAlerts || hasActiveAlert
        
        if (matchesSearch && matchesFavoriteFilter && matchesAlertsFilter) {
            card.classList.remove('hidden')
        } else {
            card.classList.add('hidden')
        }
    })
}

function toggleFavorite(eventKey) {
    const index = favoriteEvents.indexOf(eventKey)
    const isFavorited = index > -1
    
    if (isFavorited) {
        favoriteEvents.splice(index, 1)
    } else {
        favoriteEvents.push(eventKey)
    }
    localStorage.setItem('favorite-events', JSON.stringify(favoriteEvents))
    
    // Update all favorite stars for this event key
    document.querySelectorAll(`[data-event-key="${eventKey}"] .favorite-star`).forEach(favoriteStar => {
        if (!favoriteStar) return
        if (!isFavorited) {
            favoriteStar.classList.add('favorited')
            favoriteStar.textContent = '★'
        } else {
            favoriteStar.classList.remove('favorited')
            favoriteStar.textContent = '☆'
        }
    })
    
    filterEvents()
}

function sendNotification(eventName, timeRemaining) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const nOpts = {
            body: `${eventName} starts in ${timeRemaining}`,
            icon: 'assets/favicon.svg', // existing asset; removed old missing svg
            tag: eventName
        };
        try { new Notification(`GW2 Event Starting Soon!`, nOpts); }
        catch(err){ console.warn('Notification failed', err); }
    }
}

function showToast(message) {
    const toast = document.getElementById('toast')
    toast.textContent = message
    toast.classList.add('show')
    
    setTimeout(() => {
        toast.classList.remove('show')
    }, 3000)
}

// Event Chain Detection Functions
function findEventChains(eventKey) {
    if (!events.eventChains || !enableChainAlerts) return []
    
    const chains = []
    events.eventChains.forEach(chain => {
        const eventIndex = chain.events.findIndex(e => e.key === eventKey)
        if (eventIndex !== -1) {
            chains.push({ chain, eventIndex })
        }
    })
    return chains
}

function scheduleChainAlerts(completedEventKey) {
    if (!enableChainAlerts) return
    
    const chains = findEventChains(completedEventKey)
    
    chains.forEach(({ chain, eventIndex }) => {
        // Clear any existing chain alerts for this chain
        if (activeChains.has(chain.name)) {
            clearTimeout(activeChains.get(chain.name))
        }
        
        // Schedule alerts for remaining events in the chain
        const remainingEvents = chain.events.slice(eventIndex + 1)
        
        remainingEvents.forEach(chainEvent => {
            const delayMs = chainEvent.delay * 60 * 1000 // Convert minutes to milliseconds
            
            const timeoutId = setTimeout(() => {
                // Find the next event instance
                const nextEvent = allEvents.find(event => 
                    event.parentEvent.key === chainEvent.key && 
                    event.remainingMS > 0 && 
                    event.remainingMS < 30 * 60 * 1000 // Within 30 minutes
                )
                
                if (nextEvent) {
                    showToast(`🔗 Chain Alert: ${nextEvent.parentEvent.name} starts soon! ${chainEvent.note}`)
                    sendNotification(`Chain Event: ${nextEvent.parentEvent.name}`, chainEvent.note)
                    
                    // Auto-set a 5-minute reminder if no reminder is set
                    if (nextEvent.reminderMSbeforEvent === "no") {
                        updateAlert(nextEvent)
                    }
                }
            }, delayMs)
            
            activeChains.set(chain.name, timeoutId)
        })
        
        // Show initial chain detection notification
        showToast(`🔗 Chain detected: ${chain.name} - Next events will be auto-alerted`)
    })
}

function toggleChainAlerts() {
    enableChainAlerts = !enableChainAlerts
    localStorage.setItem('chain-alerts-enabled', JSON.stringify(enableChainAlerts))
    
    if (!enableChainAlerts) {
        // Clear all active chain alerts
        activeChains.forEach(timeoutId => clearTimeout(timeoutId))
        activeChains.clear()
        showToast('🔗 Event chain alerts disabled')
    } else {
        showToast('🔗 Event chain alerts enabled')
    }
    
    updateChainToggleUI()
}

function updateChainToggleUI() {
    const chainToggle = document.getElementById('chain-alerts-toggle')
    if (chainToggle) {
        chainToggle.classList.toggle('active', enableChainAlerts)
        chainToggle.title = enableChainAlerts ? 
            'Chain alerts enabled - Click to disable' : 
            'Chain alerts disabled - Click to enable'
    }
}

// GW2 API functionality
class GW2API {
    constructor() {
        this.apiKey = localStorage.getItem('gw2-api-key') || '';
        this.accountData = null;
        this.achievements = null;
        this.lastFetch = null;
        this.baseUrl = 'https://api.guildwars2.com/v2';
        // Dynamic daily world-boss detection (Wizard's Vault era):
        // We build a mapping each day by scanning /v2/achievements/daily and matching names.
        this.dailyBossIdMap = {}; // eventKey -> achievementId (for today only)
        this.dailyBossBuildDay = null; // UTC day string used to know when to rebuild
    this.dailyBossCompletedIds = new Set(); // achievementIds already completed today (optional shortcut)
    // Extended WV scope caches
    this.wvScopeByAchId = {}; // achievementId -> 'daily' | 'weekly' | 'special'
    this._wvCacheMeta = { dailyDay: null, weeklyWeek: null, specialExpiry: 0 };
    // Cache raw WV objectives (id -> objective object) so we can rely on title/progress now that achievement_id is absent
    this._wvObjectivesById = {}; // id -> { title, progress_current, progress_complete, claimed, _wvScope }
        // Canonical boss name variants for fuzzy match (lowercase substrings)
        this.bossNameVariants = {
            ShadowBehemoth: ['shadow behemoth'],
            FireElemental: ['fire elemental'],
            SvanirShamanChief: ['svanir shaman chief','svanir shaman'],
            GreatJungleWurm: ['great jungle wurm'],
            GolemMarkII: ['golem mark ii','golem mark 2'],
            TheShatterer: ['the shatterer'],
            Tequatl: ['tequatl'],
            TripleTrouble: ['evolved jungle wurm','triple trouble'],
            KarkaQueen: ['karka queen'],
            ClawofJormag: ['claw of jormag'],
            AdmiralTaidhaCovington: ['admiral taidha covington','taidha'],
            Megadestroyer: ['megadestroyer'],
            ModniirUlgoth: ['modniir ulgoth','ulgoth'],
            // Meta-event weekly rotation additions
            PathToAscension: ['path to ascension'],
            UnlockingWizardsTower: ['unlocking the wizard\'s tower','unlocking the wizards tower'],
            AetherbladeAssault: ['aetherblade assault']
        };
        // NOTE: Ley-Line Anomaly currently excluded (not a standard WV daily achievement)
    }

    setApiKey(key) {
        this.apiKey = key;
        if (key) {
            localStorage.setItem('gw2-api-key', key);
        } else {
            localStorage.removeItem('gw2-api-key');
        }
        this.accountData = null;
        this.achievements = null;
    }

    async validateApiKey() {
        if (!this.apiKey) return false;
        
        try {
            const response = await fetch(`${this.baseUrl}/account?access_token=${this.apiKey}`);
            if (response.ok) {
                this.accountData = await response.json();
                return true;
            }
            return false;
        } catch (error) {
            console.error('API validation error:', error);
            return false;
        }
    }

    async fetchAchievements() {
        if (!this.apiKey) {
            console.log('No API key available for fetching achievements');
            return null;
        }
        
        console.log('Fetching achievements from GW2 API...');
        
        try {
            const url = `${this.baseUrl}/account/achievements?access_token=${this.apiKey}`;
            console.log('Fetching from:', url);
            
            const response = await fetch(url);
            console.log('Response status:', response.status, response.statusText);
            
            if (response.ok) {
                this.achievements = await response.json();
                this.lastFetch = Date.now();
                console.log(`Successfully fetched ${this.achievements.length} achievements`);
                return this.achievements;
            } else {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                return null;
            }
        } catch (error) {
            console.error('Achievements fetch error:', error);
            return null;
        }
    }

    isEventCompleted(eventKey) {
    const mappedId = this.dailyBossIdMap[eventKey];
    if (!mappedId) return false;
    // First try account achievements (world bosses etc.)
    if (this.achievements) {
        const achievement = this.achievements.find(a => a.id === mappedId);
        if (achievement) return !!achievement.done;
    }
    // Fallback: WV objective progress (weekly/special meta objectives use WV-only ids)
    const obj = this._wvObjectivesById[mappedId];
    if (obj) {
    // Require full progress (e.g. 15/15) – partial progress should NOT auto-mark
    const hasProgressNumbers = (typeof obj.progress_current === 'number' && typeof obj.progress_complete === 'number' && obj.progress_complete > 0);
    const completeViaProgress = hasProgressNumbers && obj.progress_current >= obj.progress_complete;
    // Respect user auto-mark toggle for WV-only objectives (no achievement entry)
    const autoMarkEnabled = JSON.parse(localStorage.getItem('auto-mark-enabled') || 'true');
    if (!autoMarkEnabled) return false;
    return !!(obj.claimed || completeViaProgress);
    }
    return false;
    }
    
    // Get all completed events for today
    getCompletedEvents() {
    if (!this.achievements) return [];
    return Object.keys(this.dailyBossIdMap).filter(key => this.isEventCompleted(key));
    }

    async getAccountInfo() {
        if (!this.accountData && this.apiKey) {
            await this.validateApiKey();
        }
        return this.accountData;
    }
}

// Initialize GW2 API
const gw2Api = new GW2API();

let now = new Date();
// Show countdown only in final 15 minutes
const minTimeToShowCountdown = 15 * 60 * 1000
const maxTimeToShowCards = 5 * 60 * 60 * 1000
// World boss identification (align with dynamic WV daily matching set)
const WORLD_BOSS_KEYS = new Set([
    'ShadowBehemoth','FireElemental','SvanirShamanChief','GreatJungleWurm','GolemMarkII','ClawofJormag',
    'AdmiralTaidhaCovington','Megadestroyer','TheShatterer','ModniirUlgoth','Tequatl','KarkaQueen','TripleTrouble'
]);

// What's New modal version (bump when updating notes)
// Format: YYYY-MM-DD + letter suffix for multiple releases/day
let WHATS_NEW_VERSION = '2025-08-10h'; // updated notes: earliest-only meta reminder, onboarding scan, exclusions
// Auto-bump helper: if developer forgets to change version but list changed, allow console helper
window.bumpWhatsNewVersion = (suffix = 'a') => {
    const d = new Date();
    const iso = d.toISOString().slice(0,10);
    WHATS_NEW_VERSION = `${iso}${suffix}`;
    localStorage.removeItem('whats-new-dismissed-version');
    console.info('[WhatsNew] Bumped version to', WHATS_NEW_VERSION, 'and cleared dismissal. Reload to display.');
};
// If a special flag is set before load, force auto bump with date (for CI or scripted deploy)
if (localStorage.getItem('whats-new-auto-bump') === 'true') {
    window.bumpWhatsNewVersion('a');
    localStorage.removeItem('whats-new-auto-bump');
}

class EventClass {
    constructor(parentEvent, event, start) {
        this.parentEvent = parentEvent;
        this.event = event;
        this.eventid = start + parentEvent.key
        this.localStartTime = getLocalTime(start)
        this.color = getObjByKey(events.categories, parentEvent.categoryKey).color
        if (this.localStartTime < now) {this.localStartTime.setDate(this.localStartTime.getDate() +1 )}
        
        // Load reminder state from localStorage
        this.reminderMSbeforEvent = this.getReminderFromLocalStorage()
        
        this.remainingMS = null
        this.timeoutID = null
        this.intervalID = null
        this.card = null
        this.notificationSent = false
    }
    
    getReminderFromLocalStorage() {
        const saved = localStorage.getItem(`reminder-${this.eventid}`)
        if (saved && saved !== "null") {
            return saved === "no" ? "no" : parseInt(saved)
        }
        return "no"
    }
    
    saveReminderToLocalStorage() {
        localStorage.setItem(`reminder-${this.eventid}`, this.reminderMSbeforEvent.toString())
    }
    
    isChainStartEvent() {
        // Check if this event is the first event in any event chain
        if (!events.eventChains) return false
        
        return events.eventChains.some(chain => {
            return chain.events.length > 0 && 
                   chain.events[0].key === this.parentEvent.key &&
                   chain.events[0].delay === 0
        })
    }
    
    addEventToDOM() {
        let clone = cardTemplate.content.cloneNode(true)
        const cardElem = clone.querySelector(".event-card-element");
        const eventCard = clone.querySelector(".event-card");
        
        cardElem.id =  this.eventid;
        cardElem.classList.add(this.parentEvent.key);
        cardElem.setAttribute('data-event-key', this.parentEvent.key);
        eventCard.style.borderColor =  this.color;
        eventCard.style.setProperty('--category-color', this.color);
        
        // Set background image from category if available
    applyProceduralBackground(eventCard, this.parentEvent.categoryKey);
        
        // Set text content
    const titleEl = clone.querySelector(".event-title");
    titleEl.childNodes[0].textContent = this.parentEvent.name + " "; // ensure space before note
    clone.querySelector(".event-note").textContent = this.parentEvent.note || "";
    clone.querySelector(".event-map").textContent = this.event.map;
    clone.querySelector(".event-start-time").textContent = getTimeAsStr(this.localStartTime);
    const remainingEl = clone.querySelector(".remaining-time")
    const sepEl = clone.querySelector('.countdown-separator')
    remainingEl.textContent = "";
    if (sepEl) sepEl.style.display = 'none'
        
        // Set up favorite star
        const favoriteStar = clone.querySelector(".favorite-star")
        // Render as empty star initially (consistent styling using text glyph)
        favoriteStar.textContent = favoriteEvents.includes(this.parentEvent.key) ? '★' : '☆'
        if (favoriteEvents.includes(this.parentEvent.key)) {
            favoriteStar.classList.add('favorited')
        }
        favoriteStar.addEventListener('click', () => { toggleFavorite(this.parentEvent.key) })

        // Set up links
        const wikiLink = clone.querySelector(".wiki-link");
        wikiLink.addEventListener('click', () => {
            window.open(this.parentEvent.wiki, '_blank');
        });
        
        const fastfLink = clone.querySelector(".fastf-link");
        if (this.parentEvent.fastF) {
            fastfLink.addEventListener('click', () => {
                window.open(this.parentEvent.fastF, '_blank');
            });
        } else {
            fastfLink.style.opacity = '0.3';
            fastfLink.style.cursor = 'not-allowed';
        }

        eventTable.appendChild(clone)
        this.card = document.getElementById(this.eventid)

        // Waypoint Link
        let wp = this.card.querySelector(".waypoint-link")
        let copy = `${getTimeAsStr(this.localStartTime)} || ${this.parentEvent.name} || ${this.event.waypoint}`
        wp.addEventListener("click", () => {  
            navigator.clipboard.writeText(copy)
            showToast('Waypoint copied to clipboard')
        })

        //Reminder Link
        let rl = this.card.querySelector(".reminder-link")
        rl.addEventListener("click", () => { updateAlert(this) } )
        
        // Set initial reminder display based on localStorage
        if (this.reminderMSbeforEvent === "no") {
            rl.innerHTML = '<div class="reminder-icon"></div>'
        } else if (this.reminderMSbeforEvent === 2 * 60000) {
            rl.textContent = "2m"
        } else if (this.reminderMSbeforEvent === 5 * 60000) {
            rl.textContent = "5m"
        } else if (this.reminderMSbeforEvent === 10 * 60000) {
            rl.textContent = "10m"
        }

        //Done Link
        let dl = this.card.querySelector(".done-link")
        let toggleCheckbox = document.getElementById(`dcb-${this.parentEvent.key}`)
        dl.addEventListener("click", () => {
            toggleCheckbox.click()
            // Update icon state & card done class
            if (toggleCheckbox.checked) {
                dl.style.backgroundColor = 'rgba(46, 204, 113, 0.8)';
                this.card.classList.add('done')
            } else {
                dl.style.backgroundColor = 'rgba(0,0,0,0.6)';
                this.card.classList.remove('done')
                const badge = this.card.querySelector('.api-badge');
                if (badge) badge.remove();
            }
        })

        if (toggleCheckbox && toggleCheckbox.checked) {
            dl.style.backgroundColor = 'rgba(46, 204, 113, 0.8)';
            this.card.classList.add('done')
        }

        // Chain start indicator styling
        if (this.isChainStartEvent()) {
            const title = this.card.querySelector('.event-title');
            if (title) {
                title.classList.add('chain-start');
                // Append tooltip info without overwriting any existing title text
                const tipFragment = 'Meta chain start';
                if (!title.title.includes(tipFragment)) {
                    title.title = title.title ? (title.title + ' | ' + tipFragment) : tipFragment;
                }
            }
        }

        // World boss indicator
        if (WORLD_BOSS_KEYS.has(this.parentEvent.key)) {
            const title = this.card.querySelector('.event-title');
            if (title && !title.classList.contains('world-boss')) {
                title.classList.add('world-boss');
                title.title = (title.title ? title.title + ' | ' : '') + 'World Boss';
            }
        }

        // Overflow menu (mobile) population
        const overflowWrap = this.card.querySelector('.overflow-wrapper');
        const overflowMenu = this.card.querySelector('.overflow-menu');
        const overflowBtn  = this.card.querySelector('.overflow-menu-btn');
        if (overflowWrap && overflowMenu && overflowBtn) {
            // Build menu entries only once
            if (!overflowMenu.hasChildNodes()) {
                const makeItem = (label, cb, icon='') => {
                    const b = document.createElement('button');
                    b.setAttribute('role','menuitem');
                    b.innerHTML = (icon ? `<span>${icon}</span>` : '') + `<span>${label}</span>`;
                    b.addEventListener('click', () => { cb(); closeMenu(); });
                    overflowMenu.appendChild(b);
                    return b;
                };
                // Reference existing buttons
                const fastBtn = this.card.querySelector('.fastf-link');
                if (fastBtn && !fastBtn.style.display.includes('none')) makeItem('[fast] Guide', () => fastBtn.click(), '🚀');
                const wikiBtn = this.card.querySelector('.wiki-link');
                if (wikiBtn && !wikiBtn.style.display.includes('none')) makeItem('Wiki Page', () => wikiBtn.click(), '📖');
                const wpBtn = this.card.querySelector('.waypoint-link');
                if (wpBtn) makeItem('Copy Waypoint', () => wpBtn.click(), '📍');
                const favBtn = this.card.querySelector('.favorite-star');
                if (favBtn) makeItem('Toggle Favorite', () => favBtn.click(), '☆');
            }
            function closeMenu(){
                overflowMenu.classList.remove('open');
                overflowBtn.setAttribute('aria-expanded','false');
            }
            overflowBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const open = overflowMenu.classList.toggle('open');
                overflowBtn.setAttribute('aria-expanded', open ? 'true':'false');
            });
            document.addEventListener('click', (e) => {
                if (!overflowWrap.contains(e.target)) closeMenu();
            });
            // Keyboard accessibility
            overflowBtn.addEventListener('keydown', (e) => { if (e.key==='Escape') closeMenu(); });
        }

        //Toggle Visibility based on localStorage Settings
        let visibility = getVisibilityFromLocalStorage(this.parentEvent.key)
        toggleVisibility(this.parentEvent.key, visibility)
    }
    
    setupSmartTooltips() {
        const tooltipElements = this.card.querySelectorAll('.links-tab[tooltip]')
        
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', () => {
                // Check if element is near the top of the viewport
                const rect = element.getBoundingClientRect()
                const tooltipHeight = 50 // Approximate tooltip height
                const spaceAbove = rect.top
                
                if (spaceAbove < tooltipHeight + 20) {
                    // Not enough space above, position below
                    element.classList.add('tooltip-below')
                } else {
                    // Enough space above, position normally
                    element.classList.remove('tooltip-below')
                }
            })
        })
    }
    
    updateCard() {
        this.remainingMS = this.localStartTime - now
        if (this.localStartTime > now.getTime() + maxTimeToShowCards) {return}
        if (!this.card) {this.addEventToDOM()}
        // Show countdown only when within threshold
        const rt = this.card.querySelector('.remaining-time')
        const sep = this.card.querySelector('.countdown-separator')
        if (this.remainingMS < minTimeToShowCountdown) {
            this.updateCountDown()
            if (sep) sep.classList.add('visible')
            if (rt) rt.classList.add('visible')
        } else {
            if (sep) sep.classList.remove('visible')
            if (rt) { rt.classList.remove('visible'); rt.textContent = '' }
        }
        
        // Send notification if event is starting in 5 minutes and hasn't been notified yet
        if (this.remainingMS <= 5 * 60 * 1000 && this.remainingMS > 4.5 * 60 * 1000 && !this.notificationSent) {
            const minutes = Math.ceil(this.remainingMS / 60000)
            sendNotification(this.parentEvent.name, `${minutes} minute${minutes > 1 ? 's' : ''}`)
            this.notificationSent = true
        }
        
        if (this.remainingMS < 0) {
            this.card.remove()
            this.localStartTime.setDate(this.localStartTime.getDate() +1)
            clearInterval(this.intervalID)
            this.notificationSent = false // Reset for next occurrence
        }
    }
    updateCountDown() {
        let element = this.card.querySelector(".remaining-time")
        let min = Math.floor((this.remainingMS % (1000*60*60))/(1000*60));
        let sec = Math.floor((this.remainingMS % (1000*60))/(1000));
        let secStr = String(sec).padStart(2,"0");
        element.textContent = min + ":" + secStr
        
        // Add visual feedback based on time remaining
        element.className = "remaining-time"; // Reset classes
        
        if (this.remainingMS <= 60000) { // Less than 1 minute - urgent
            element.classList.add("urgent");
        } else if (this.remainingMS <= 300000) { // Less than 5 minutes - soon
            element.classList.add("soon");
        } else if (this.remainingMS <= 0) { // Ready/happening now
            element.classList.add("ready");
        }
    }
}

// Add toggle list categories
for (let category of events.categories) {
    addToggleCategory(category)
}

// Add visibility toggles
for (let parent of events.parentEvents) {
    addToggleElement(parent)
}

// Init all events
for (let event of events.events) {
    for (let start of event.start) {
        let pEvt =  getObjByKey(events.parentEvents, event.parentKey);
        let evt = new EventClass(pEvt, event, start)
        allEvents.push(evt)
    }
}

//Sort all events
allEvents.sort((a, b) => a.localStartTime - b.localStartTime)

//Hide browser-settings-alert in the SideBar
if (localStorage.length > 0) {
    document.getElementById("browser-settings-alert").remove()
} else {
    // analytics removed
}

//Add Cards to DOM
updateEventCards()

//Update cards
setInterval(interval, 1000)
function interval(){
    now = new Date();
    updateEventCards()
}

// Auto-refresh API achievements every 10 minutes
setInterval(async () => {
    if (gw2Api.apiKey && gw2Api.achievements) {
        console.log('Auto-refreshing GW2 achievements...');
        await gw2Api.fetchAchievements();
        updateEventStatesFromAPI();
    }
}, 10 * 60 * 1000); // 10 minutes

function addToggleCategory(category) {
    let clone = categoryTemplate.content.cloneNode(true)

    clone.querySelector(".categories-label").innerHTML = category.name
    clone.querySelector(".tgl-category-element").style.borderColor = category.color
    clone.querySelector(".tgl-container").id = category.key
    clone.querySelector(".category-checkbox").id = `catTgl-${category.key}`
    // Load category checkbox state from localStorage
    const categoryChecked = localStorage.getItem(`category-enabled-${category.key}`) !== 'false'
    clone.querySelector(".category-checkbox").checked = categoryChecked
    // Remove the htmlFor to prevent label from toggling checkbox
    // clone.querySelector(".categories-label").htmlFor = `catTgl-${category.key}`

    categoryList.appendChild(clone)

    // Get elements from DOM after appending
    let categoryToggle = document.getElementById(`catTgl-${category.key}`)
    let categoryContainer = document.getElementById(category.key)
    let categoryElement = categoryContainer.closest('.tgl-category-element')
    let categoryHeader = categoryElement.querySelector(".categories-header")
    let categoryArrow = categoryElement.querySelector(".category-arrow")
    
    // Load collapse state from localStorage
    const isCollapsed = localStorage.getItem(`category-collapsed-${category.key}`) === 'true'
    if (isCollapsed) {
        categoryContainer.classList.add('collapsed')
        categoryArrow.classList.add('collapsed')
    }
    
    // Add click handler for collapse/expand (excluding the checkbox)
    categoryHeader.addEventListener("click", (e) => {
        // Only allow collapse/expand when clicking on the label or arrow, not the checkbox
        if (e.target === categoryToggle || e.target.closest('.category-checkbox')) return
        
        e.preventDefault() // Prevent any default label behavior
        
        const isCurrentlyCollapsed = categoryContainer.classList.contains('collapsed')
        
        if (isCurrentlyCollapsed) {
            categoryContainer.classList.remove('collapsed')
            categoryArrow.classList.remove('collapsed')
            localStorage.removeItem(`category-collapsed-${category.key}`)
        } else {
            categoryContainer.classList.add('collapsed')
            categoryArrow.classList.add('collapsed')
            localStorage.setItem(`category-collapsed-${category.key}`, 'true')
        }
    })

    categoryToggle.addEventListener("change", () => {
        // Save category checkbox state to localStorage
        localStorage.setItem(`category-enabled-${category.key}`, categoryToggle.checked.toString())
        
        let AllvisibilityCheckbox = document.getElementsByClassName(`vcb-${category.key}`)
        const event = new Event("change");
        console.log(AllvisibilityCheckbox, `vcb-${category.key}`)
        for (let cb of AllvisibilityCheckbox) {
            cb.checked = categoryToggle.checked
            cb.dispatchEvent(event)
        }

    })
}

function addToggleElement(parentEvent) {
    let clone = toggleTemplate.content.cloneNode(true)
    let tglList = document.getElementById(parentEvent.categoryKey)

    clone.querySelector(".tgl-label").textContent = parentEvent.name
    clone.querySelector(".visibility-checkbox").checked = getVisibilityFromLocalStorage(parentEvent.key)
    clone.querySelector(".visibility-checkbox").id = `vcb-${parentEvent.key}`
    clone.querySelector(".visibility-checkbox").classList.add(`vcb-${parentEvent.categoryKey}`)
    clone.querySelector(".tgl-label").htmlFor = `vcb-${parentEvent.key}`
    clone.querySelector(".done-checkbox").checked = getDoneFromLocalStorage(parentEvent.key)
    clone.querySelector(".done-checkbox").id = `dcb-${parentEvent.key}`

    tglList.appendChild(clone)

    let visibilityToggle = document.getElementById(`vcb-${parentEvent.key}`)
    visibilityToggle.addEventListener("change", (e) => {
        toggleVisibility(parentEvent.key, e.target.checked)
    // analytics removed
    })

    let doneToggle = document.getElementById(`dcb-${parentEvent.key}`)
    doneToggle.addEventListener("change", (e) => {
        toggleDone(parentEvent.key, e.target.checked)
    })
}

function getVisibilityFromLocalStorage(parentEventKey) {
    let value = localStorage.getItem(parentEventKey)
    if (value === "false") {return false}
    return true
}

function getDoneFromLocalStorage(parentEventKey){
    let value = localStorage.getItem(`done-${parentEventKey}`)
    let valueDate = new Date(value)

    if (now < valueDate ) {
        return true
    }

    localStorage.removeItem(`done-${parentEventKey}`)
    return false
}

function getObjByKey(ArrOfObject, key){
    for (let obj of ArrOfObject) {
        if (obj.key === key) { return obj }
    }
}

function toggleVisibility(parentEventKey, visibility) {
    let elements = document.getElementsByClassName(parentEventKey)
    if (visibility === true) {
        for (let e of elements) {
            e.style.display = "flex"
            localStorage.removeItem(parentEventKey)
        }
    }
    if (visibility === false) {
        for (let e of elements) {
            e.style.display = "none"
            localStorage.setItem(parentEventKey, "false")
        }
    }
}

function toggleDone(parentEventKey, value) {
    let elements = document.getElementsByClassName(`di-${parentEventKey}`)

    if (value === false) {
        for (let e of elements) {
            e.src = "assets/done_outline_FFFFFF.svg"
            localStorage.removeItem(`done-${parentEventKey}`)
        }
    // Remove API badge if user manually unmarks
    document.querySelectorAll(`.${parentEventKey} .api-badge`).forEach(b => b.remove());
    }
    if (value === true) {
        for (let e of elements) {
            e.src = "assets/done_outline_75FB4C_.svg"
            let ServerResetTime = new Date()
            ServerResetTime.setUTCHours(24)
            ServerResetTime.setUTCMinutes(0)
            ServerResetTime.setUTCSeconds(0)
            ServerResetTime.setUTCMilliseconds(0)
            localStorage.setItem(`done-${parentEventKey}`, ServerResetTime)
        }
        
        // Trigger event chain detection when marking as done
        scheduleChainAlerts(parentEventKey)
    }
}

function getLocalTime(uctZeroStartTimeAsString) {
    let splitTimStr = uctZeroStartTimeAsString.split(":")
    let splitTime = [
        parseInt(splitTimStr[0]),
        parseInt(splitTimStr[1]),
    ]
    let time = new Date()
    time.setUTCHours(splitTime[0])
    time.setUTCMinutes(splitTime[1])
    time.setUTCSeconds(0)
    time.setUTCMilliseconds(0)
    return time
}

function getTimeAsStr(time){
    let hours = String(time.getHours()).padStart(2, " ")
    let min = String(time.getMinutes()).padStart(2, "0")
    return `${hours}:${min}`
}

function updateEventCards() {
    for (let i = 0; i < allEvents.length; i++) {
        allEvents[i].updateCard()
    }
}

// Track last reset for API auto-clearing
function isAfterDailyReset(timestamp) {
    if (!timestamp) return true;
    const last = new Date(timestamp);
    const nowUTC = new Date();
    // Daily reset at 00:00 UTC
    const reset = new Date();
    reset.setUTCHours(0,0,0,0);
    return last < reset; // if last sync happened before today's reset
}

function updateAlert(Event){

    let element = Event.card.querySelector(".reminder-link")

    if (Event.reminderMSbeforEvent === "no" ) {
        Event.reminderMSbeforEvent = 2 * 60000
        if (Event.remainingMS < Event.reminderMSbeforEvent) { setReminderToNo(); return }
        element.textContent = "2m"
        Event.saveReminderToLocalStorage()
    } else
    if (Event.reminderMSbeforEvent === 2 * 60000 ) {
        Event.reminderMSbeforEvent = 5 * 60000
        if (Event.remainingMS < Event.reminderMSbeforEvent) { setReminderToNo(); return }
        element.textContent = "5m"
        clearTimeout(Event.timeoutID)
        Event.saveReminderToLocalStorage()
    } else
    if (Event.reminderMSbeforEvent === 5 * 60000 ) {
        Event.reminderMSbeforEvent = 10 * 60000
        element.textContent = "10m"
        if (Event.remainingMS < Event.reminderMSbeforEvent) { setReminderToNo(); return }
        clearTimeout(Event.timeoutID)
        Event.saveReminderToLocalStorage()
    } else
    if (Event.reminderMSbeforEvent === 10 * 60000) {
        setReminderToNo()
        return;
    }

    let reminderInMS = Event.remainingMS - Event.reminderMSbeforEvent
    Event.timeoutID = setTimeout(()=> {alert()}, reminderInMS);

    function setReminderToNo(){
        Event.reminderMSbeforEvent = "no"
        Event.saveReminderToLocalStorage()
        clearTimeout(Event.timeoutID)
        clearInterval(Event.intervalID)
        element.textContent = ""
        let icon = document.createElement('div')
        icon.className = 'reminder-icon'
        icon.alt = "Reminder switch 2 5 10 Minutes"
        element.appendChild(icon)
        // No suppression: allow reapplication on next API rescan if still the next upcoming meta occurrence.
    }

    function alert(){
        const p = alertSound.play();
        if (p && typeof p.then === 'function') {
            p.catch(err => console.warn('Alert sound blocked or failed:', err));
        }

        let x = 0

        let icon = document.createElement("div");
        icon.className = 'reminder-icon-active'
        icon.alt = "Reminder"
        element.textContent = ""
        element.appendChild(icon)

        Event.intervalID = setInterval(()=>{blink()}, 1000)
        function blink(){
            if (x === 0) { element.style.backgroundColor = Event.color || "var(--accent-color)"; x=1}
            else { element.style.backgroundColor = "var(--alt-bg-color)"; x=0}
        }

    try { umami.track(`A Gamer got notified about ${Event.parentEvent.name}`); } catch (err) { console.debug('umami track failed', err); }
    }
    
    // Update filters to reflect alert changes
    filterEvents()
}

// Helper: schedule a fixed reminder without cycling the 2m->5m->10m sequence
function scheduleFixedReminder(Event, minutes){
    const element = Event.card.querySelector('.reminder-link');
    Event.reminderMSbeforEvent = minutes * 60000;
    if (Event.remainingMS < Event.reminderMSbeforEvent) {
        // Too close; abort and clear
        Event.reminderMSbeforEvent = 'no';
        Event.saveReminderToLocalStorage();
        if (element) element.textContent = '';
        return;
    }
    // Persist
    Event.saveReminderToLocalStorage();
    if (element) element.textContent = `${minutes}m`;
    clearTimeout(Event.timeoutID);
    const reminderInMS = Event.remainingMS - Event.reminderMSbeforEvent;
    Event.timeoutID = setTimeout(()=>{ triggerFixedReminder(); }, reminderInMS);

    function triggerFixedReminder(){
        const p = alertSound.play();
        if (p && typeof p.then === 'function') {
            p.catch(err => console.warn('Alert sound blocked or failed:', err));
        }
        let x = 0;
        if (element){
            const icon = document.createElement('div');
            icon.className = 'reminder-icon-active';
            icon.alt = 'Reminder';
            element.textContent = '';
            element.appendChild(icon);
            Event.intervalID = setInterval(()=>{ if (x===0){ element.style.backgroundColor = Event.color || 'var(--accent-color)'; x=1;} else { element.style.backgroundColor = 'var(--alt-bg-color)'; x=0;} }, 1000);
        }
        try { umami.track(`A Gamer got notified about ${Event.parentEvent.name}`); } catch (err) { console.debug('umami track failed', err); }
        filterEvents();
    }
    filterEvents();
}

// (Removed week-based suppression logic; simplified auto-alert sequencing)
// GW2 API Interface functions
function initializeApiInterface() {
    const apiKeyInput = document.getElementById('api-key-input');
    const apiKeySave = document.getElementById('api-key-save');
    const apiKeyClear = document.getElementById('api-key-clear');
    const apiStatus = document.getElementById('api-status');
    const autoMarkBtn = document.getElementById('toggle-auto-mark');
    const weeklyAutoAlertBtn = document.getElementById('toggle-weekly-autoalert');
    // Legacy (removed) sidebar refresh button; guard in case it's gone
    const apiRefresh = document.getElementById('api-refresh');

    // Debug: Check if elements exist
    console.log('API Elements found:', {
        input: !!apiKeyInput,
        save: !!apiKeySave,
        clear: !!apiKeyClear,
        status: !!apiStatus
    });

    if (!apiKeyInput || !apiKeySave || !apiKeyClear || !apiStatus) {
        console.error('Some API elements not found in DOM');
        return;
    }
    // (Week-based cleanup removed)
    // Initialize new icon-based toggles
    const autoMarkEnabled = JSON.parse(localStorage.getItem('auto-mark-enabled') || 'true');
    if (autoMarkBtn) {
        autoMarkBtn.classList.toggle('active', autoMarkEnabled);
        autoMarkBtn.setAttribute('aria-pressed', String(autoMarkEnabled));
        autoMarkBtn.addEventListener('click', () => {
            const newVal = !autoMarkBtn.classList.contains('active');
            autoMarkBtn.classList.toggle('active', newVal);
            autoMarkBtn.setAttribute('aria-pressed', String(newVal));
            localStorage.setItem('auto-mark-enabled', JSON.stringify(newVal));
            if (newVal) {
                if (gw2Api.achievements) updateEventStatesFromAPI();
                showToast('Auto-mark enabled');
            } else {
                showToast('Auto-mark disabled');
                document.querySelectorAll('.api-badge').forEach(b => b.remove());
            }
        });
    }
    const weeklyAlertEnabled = JSON.parse(localStorage.getItem('weekly-autoalert-enabled') || 'true');
    if (weeklyAutoAlertBtn) {
        weeklyAutoAlertBtn.classList.toggle('active', weeklyAlertEnabled);
        weeklyAutoAlertBtn.setAttribute('aria-pressed', String(weeklyAlertEnabled));
        weeklyAutoAlertBtn.addEventListener('click', () => {
            const newVal = !weeklyAutoAlertBtn.classList.contains('active');
            weeklyAutoAlertBtn.classList.toggle('active', newVal);
            weeklyAutoAlertBtn.setAttribute('aria-pressed', String(newVal));
            localStorage.setItem('weekly-autoalert-enabled', JSON.stringify(newVal));
            showToast(newVal ? 'Weekly meta auto-alerts enabled' : 'Weekly meta auto-alerts disabled');
        });
    }

    // Load existing API key
    if (gw2Api.apiKey) {
        apiKeyInput.value = gw2Api.apiKey;
        validateAndShowStatus();
    }

    // Save API key
    apiKeySave.addEventListener('click', async () => {
        const key = apiKeyInput.value.trim();
        if (!key) {
            showApiStatus('Please enter an API key', 'error');
            return;
        }

        showApiStatus('Validating API key...', 'loading');
        
        gw2Api.setApiKey(key);
        const isValid = await gw2Api.validateApiKey();
        
        if (isValid) {
            const accountInfo = await gw2Api.getAccountInfo();
            showApiStatus(`Connected as: ${accountInfo.name}`, 'success');
            
            // Fetch achievements & build WV mapping before first update to ensure weekly metas processed immediately
            await gw2Api.fetchAchievements();
            try { await buildDailyBossMappingIfNeeded(); } catch(e){ console.debug('Initial WV mapping build failed', e); }
            updateEventStatesFromAPI();
        } else {
            showApiStatus('Invalid API key or insufficient permissions', 'error');
            gw2Api.setApiKey('');
        }
    });

    // Clear API key
    apiKeyClear.addEventListener('click', () => {
        apiKeyInput.value = '';
        gw2Api.setApiKey('');
        showApiStatus('API key cleared', 'error');
        
        // Reset all event states
        resetEventStates();
    });

    // Refresh achievements and update events (only if legacy button still exists)
    if (apiRefresh) {
        apiRefresh.addEventListener('click', async () => {
            if (!gw2Api.apiKey) {
                showApiStatus('Please set an API key first', 'error');
                return;
            }
            showApiStatus('Refreshing achievement data...', 'loading');
            const achievements = await gw2Api.fetchAchievements();
            if (achievements) {
                console.log(`Refreshed ${achievements.length} achievements`);
                updateEventStatesFromAPI();
            } else {
                showApiStatus('Failed to refresh achievement data', 'error');
            }
        });
    } else {
        console.log('Legacy api-refresh button not found (expected after UI cleanup)');
    }

    // Enter key support
    apiKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            apiKeySave.click();
        }
    });

    async function validateAndShowStatus() {
        if (!gw2Api.apiKey) return;
        
        showApiStatus('Checking API key...', 'loading');
        const isValid = await gw2Api.validateApiKey();
        
        if (isValid) {
            const accountInfo = await gw2Api.getAccountInfo();
            showApiStatus(`Connected as: ${accountInfo.name}`, 'success');
            await gw2Api.fetchAchievements();
            updateEventStatesFromAPI();
        } else {
            showApiStatus('API key expired or invalid', 'error');
            gw2Api.setApiKey('');
            apiKeyInput.value = '';
        }
    }
}

// Helper function for API status display
function showApiStatus(message, type) {
    const apiStatus = document.getElementById('api-status');
    if (apiStatus) {
        apiStatus.textContent = message;
        apiStatus.className = `api-status ${type}`;
    }
    // Separate last sync timestamp area
    const syncEl = document.getElementById('api-last-sync');
    if (syncEl && type !== 'error' && gw2Api.lastFetch) {
    const d = new Date(gw2Api.lastFetch);
    const hh = String(d.getUTCHours()).padStart(2,'0');
    const mm = String(d.getUTCMinutes()).padStart(2,'0');
    syncEl.textContent = `Last sync: ${hh}:${mm} UTC`;
    } else if (syncEl && type === 'error') {
        syncEl.textContent = '';
    }
}

function updateEventStatesFromAPI() {
    (async () => {
        console.log('Updating event states from GW2 API...');
        if (!gw2Api.apiKey) return;
        if (!gw2Api.achievements) {
            console.log('No achievement data available');
            return;
        }

        const autoMarkEnabled = JSON.parse(localStorage.getItem('auto-mark-enabled') || 'true');
        if (!autoMarkEnabled) {
            showApiStatus('Auto-mark disabled', 'success');
            return;
        }

        await buildDailyBossMappingIfNeeded();

        const completedEvents = gw2Api.getCompletedEvents();
        console.log('Dynamic daily boss matches:', gw2Api.dailyBossIdMap);
        console.log('Completed boss events via API today:', completedEvents);

    // Track earliest upcoming occurrence per incomplete weekly/special WV meta and whether a reminder already exists
    const earliestPerMeta = new Map(); // metaKey -> EventClass
    const hasReminderPerMeta = new Map(); // metaKey -> true

        allEvents.forEach(event => {
            const isCompleted = gw2Api.isEventCompleted(event.parentEvent.key);
            const eventCard = event.card;
            const doneCheckbox = document.getElementById(`dcb-${event.parentEvent.key}`);
            if (eventCard && doneCheckbox && isCompleted && !doneCheckbox.checked) {
                doneCheckbox.checked = true;
                eventCard.classList.add('done');
                // Color the done icon like manual marking
                try {
                    const parentEventKey = event.parentEvent.key;
                    document.querySelectorAll(`[data-event-key="${parentEventKey}"] .doneIcon`).forEach(ic => {
                        ic.src = 'assets/done_outline_75FB4C_.svg';
                    });
                } catch(err){ console.debug('Done icon update failed', err); }
                const title = eventCard.querySelector('.event-title');
                if (title) {
                    let badge = title.querySelector('.api-badge');
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'api-badge';
                        badge.textContent = 'API';
                        title.appendChild(badge);
                    }
                    const achId = gw2Api.dailyBossIdMap[event.parentEvent.key];
                    const achName = gw2Api._dailyMetaNameById?.[achId];
                    const scope = gw2Api.wvScopeByAchId?.[achId];
                    if (scope) badge.classList.add(`wv-${scope}`);
                    const scopeLabel = scope ? scope.charAt(0).toUpperCase()+scope.slice(1) : 'WV';
                    badge.title = achName ? `Completed (${scopeLabel} WV objective: ${achName})` : `Completed (${scopeLabel} WV objective)`;
                }
            } else if (!isCompleted) {
                const metaKey = event.parentEvent.key;
                const achId = gw2Api.dailyBossIdMap[metaKey];
                if (!achId) return; // not mapped
                const scope = gw2Api.wvScopeByAchId?.[achId];
                if (!(scope === 'weekly' || scope === 'special')) return;
                const weeklyAlertsOn = JSON.parse(localStorage.getItem('weekly-autoalert-enabled') || 'true');
                if (!weeklyAlertsOn) return;
                if (event.remainingMS < 5 * 60000) return; // too close
                // If any future occurrence already has a reminder, mark and skip scheduling a new one
                if (event.reminderMSbeforEvent !== 'no') { hasReminderPerMeta.set(metaKey, true); return; }
                if (hasReminderPerMeta.get(metaKey)) return; // already covered by another occurrence with active reminder
                const existing = earliestPerMeta.get(metaKey);
                if (!existing || event.localStartTime < existing.localStartTime) {
                    earliestPerMeta.set(metaKey, event);
                }
            }
        });

        // Schedule only if no existing reminder already active for that meta key
        earliestPerMeta.forEach(ev => {
            if (hasReminderPerMeta.get(ev.parentEvent.key)) return;
            try { scheduleFixedReminder(ev, 5); } catch(e){ console.warn('Auto alert scheduling failed', e); }
        });

        if (completedEvents.length > 0) {
            showApiStatus(`Auto-marked ${completedEvents.length} boss events`, 'success');
        } else {
            // Differentiate between: no matches vs matches but none done
            const bossCount = Object.keys(gw2Api.dailyBossIdMap).length;
            if (bossCount === 0) {
                showApiStatus('No WV boss/meta objectives active (auto‑mark idle)', 'success');
            } else {
                showApiStatus('API connected - no boss events done yet', 'success');
            }
        }
        localStorage.setItem('gw2-last-api-sync', gw2Api.lastFetch || Date.now());
    })();
}
// Show a banner when boss auto-marking is unavailable or informational
function showBossTrackingNotice(){ /* removed visual banner per user request */ }

// Build daily boss mapping from personal Wizard's Vault objectives (requires API key)
async function buildDailyBossMappingIfNeeded(opts = {}) {
    const forceAll = !!opts.forceAllScopes;
    const nowUtc = new Date();
    const today = nowUtc.toISOString().slice(0,10);
    // Determine ISO week string for weekly caching (YYYY-Www)
    function isoWeekString(d){
        const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        // Thursday in current week decides the year.
        dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay()||7));
        const yearStart = new Date(Date.UTC(dt.getUTCFullYear(),0,1));
        const weekNo = Math.ceil((((dt - yearStart) / 86400000) + 1)/7);
        return `${dt.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`;
    }
    const isoWeek = isoWeekString(nowUtc);
    const specialValid = !forceAll && nowUtc.getTime() < (gw2Api._wvCacheMeta.specialExpiry || 0);
    const dailyFresh = !forceAll && gw2Api._wvCacheMeta.dailyDay === today;
    const weeklyFresh = !forceAll && gw2Api._wvCacheMeta.weeklyWeek === isoWeek;
    const haveMap = Object.keys(gw2Api.dailyBossIdMap).length > 0;
    if (haveMap && dailyFresh && weeklyFresh && specialValid) return; // All scopes still fresh

    if (!gw2Api.apiKey) {
        console.log('No API key — skipping WV daily boss detection.');
        gw2Api.dailyBossIdMap = {};
    showApiStatus('Add API key to enable WV auto-mark.', 'info');
        return;
    }

    try {
        // Fetch daily, weekly, and special WV objective sets in parallel
    const [dailyRes, weeklyRes, specialRes] = await Promise.all([
            fetch(`${gw2Api.baseUrl}/account/wizardsvault/daily?access_token=${gw2Api.apiKey}`),
            fetch(`${gw2Api.baseUrl}/account/wizardsvault/weekly?access_token=${gw2Api.apiKey}`),
            fetch(`${gw2Api.baseUrl}/account/wizardsvault/special?access_token=${gw2Api.apiKey}`)
        ]);
        if (!dailyRes.ok && !weeklyRes.ok && !specialRes.ok) {
            console.warn('Failed to fetch ALL WV objective groups', {daily: dailyRes.status, weekly: weeklyRes.status, special: specialRes.status});
            showApiStatus('WV objective fetch failed (check API key)', 'error');
            return;
        }
        let allObjectiveSets = [];
        async function safeJson(res){ try { return res.ok ? await res.json() : {objectives:[]} } catch { return {objectives:[]} } }
        const [dailyData, weeklyData, specialData] = await Promise.all([
            safeJson(dailyRes), safeJson(weeklyRes), safeJson(specialRes)
        ]);
    const objectives = [];
    if (!dailyFresh) objectives.push(...(dailyData.objectives||[]).map(o=>({...o,_wvScope:'daily'})));
    if (!weeklyFresh) objectives.push(...(weeklyData.objectives||[]).map(o=>({...o,_wvScope:'weekly'})));
    if (!specialValid) objectives.push(...(specialData.objectives||[]).map(o=>({...o,_wvScope:'special'})));
        // Refresh raw cache only for scopes we re-fetched (retain others)
        objectives.forEach(o => { if (o && typeof o.id === 'number') gw2Api._wvObjectivesById[o.id] = o; });
        console.debug('[WV] Aggregated objectives counts', {daily: dailyData.objectives?.length||0, weekly: weeklyData.objectives?.length||0, special: specialData.objectives?.length||0});
        console.debug('[WV] Sample objectives (first 3 agg):', objectives.slice(0,3).map(o => ({id:o.id, achievement_id:o.achievement_id, scope:o._wvScope})));

        // Collect candidate achievement ids. Prefer explicit achievement_id if present; fall back to id.
        const primaryIds = new Set();
        const fallbackIds = new Set();
        gw2Api.dailyBossCompletedIds.clear();
        for (const o of objectives) {
            if (typeof o.achievement_id === 'number') primaryIds.add(o.achievement_id);
            else if (typeof o.id === 'number') fallbackIds.add(o.id);
            // Heuristic: mark completed achievement ids directly if objective signals completion
            if ((o.done || o.completed) && typeof o.achievement_id === 'number') {
                gw2Api.dailyBossCompletedIds.add(o.achievement_id);
            }
        }

        async function fetchAchievementMetas(idSet) {
            const ids = Array.from(idSet);
            if (ids.length === 0) return [];
            const metas = [];
            const chunkSize = 150; // API limit safety (documentation allows 200)
            for (let i = 0; i < ids.length; i += chunkSize) {
                const slice = ids.slice(i, i+chunkSize);
                try {
                    const metaRes = await fetch(`${gw2Api.baseUrl}/achievements?ids=${slice.join(',')}`);
                    if (!metaRes.ok) {
                        const txt = await metaRes.text();
                        console.warn('Meta fetch batch failed', metaRes.status, txt);
                        if (metaRes.status === 404) {
                            // All invalid in this batch; continue to next
                            continue;
                        }
                    } else {
                        const arr = await metaRes.json();
                        metas.push(...arr);
                    }
                } catch (err) {
                    console.warn('Meta fetch error for batch', slice[0], '...', err);
                }
            }
            return metas;
        }

        // Attempt meta achievement fetch only if any primaryIds exist (world boss achievements still use achievement IDs)
        let metas = [];
        if (primaryIds.size > 0) {
            metas = await fetchAchievementMetas(primaryIds);
        }
    const map = {}; const nameById = {};
        const variantKeyAliases = { ThePathtoAscension: 'PathToAscension' };
        // Existing achievement-based mapping (world bosses) retained
        metas.forEach(m => {
            if (!m || !m.name) return;
            nameById[m.id] = m.name;
            const nameLC = m.name.toLowerCase();
            for (const [eventKey, variants] of Object.entries(gw2Api.bossNameVariants)) {
                if (map[eventKey]) continue;
                if (variants.some(v => nameLC.includes(v))) map[eventKey] = m.id;
            }
            Object.entries(variantKeyAliases).forEach(([actualKey, variantKey]) => {
                if (!map[actualKey] && map[variantKey]) map[actualKey] = map[variantKey];
            });
        });

        // NEW: Weekly/Special meta detection directly from WV objective titles (since achievement_id is absent)
        const metaTitleMatchers = [
            { key: 'KainengBlackout', patterns: ['kaineng blackout meta event','kaineng blackout meta-event','complete kaineng blackout meta event','kaineng blackout'] },
            { key: 'ThePathtoAscension', patterns: ['path to ascension meta event','path to ascension meta-event','complete the path to ascension meta event','path to ascension'] },
            { key: 'AetherbladeAssault', patterns: ['aetherblade assault meta event','aetherblade assault meta-event','complete aetherblade assault meta event','aetherblade assault'] },
            { key: "Wizard'sTower", patterns: ["unlocking the wizard's tower meta event","unlocking the wizard's tower meta-event","unlock the wizard's tower meta event","unlock the wizard's tower","unlocking the wizard's tower"] }
            // TitanicVoyage intentionally omitted: dynamic meta without fixed WV weekly objective mapping
        ];
        const normalize = t => t.toLowerCase().replace(/[-–—]/g,' ').replace(/\s+/g,' ').trim();
        objectives.forEach(o => {
            if (!o || !o.title) return;
            const nt = normalize(o.title);
            // Only consider weekly and special for these metas (could appear there)
            if (o._wvScope !== 'weekly' && o._wvScope !== 'special') return;
            metaTitleMatchers.forEach(m => {
                if (map[m.key]) return; // already mapped (achievement-based or earlier match)
                if (m.patterns.some(p => nt.includes(p))) {
                    map[m.key] = o.id; // map event key to WV objective id
                    gw2Api.wvScopeByAchId[o.id] = o._wvScope;
                }
            });
        });
        // Debug: log titles containing 'meta-event' not matched
        const unmatchedMetaTitles = objectives
            .filter(o => (o._wvScope === 'weekly' || o._wvScope === 'special') && o.title && /meta[- ]event/i.test(o.title) && !Object.values(map).includes(o.id))
            .map(o => o.title);
        if (unmatchedMetaTitles.length) console.debug('[WV] Unmatched meta-event titles (for future patterns):', unmatchedMetaTitles);

        // Track scope for matched achievements (prefer narrower scope if multiple)
        const scopePriority = { daily:3, weekly:2, special:1 }; // higher = more specific / recent
        objectives.forEach(o => {
            const achId = o.achievement_id || o.id;
            if (!achId) return;
            if (!gw2Api.wvScopeByAchId[achId] || scopePriority[o._wvScope] > scopePriority[gw2Api.wvScopeByAchId[achId]]) {
                gw2Api.wvScopeByAchId[achId] = o._wvScope;
            }
        });

        // Merge with existing map if some scopes weren't refreshed
        if (!dailyFresh || !weeklyFresh || !specialValid) {
            gw2Api.dailyBossIdMap = { ...gw2Api.dailyBossIdMap, ...map };
        } else {
            gw2Api.dailyBossIdMap = map;
        }
        gw2Api.dailyBossBuildDay = today; // keep legacy field for compatibility (daily part)
        if (!dailyFresh) gw2Api._wvCacheMeta.dailyDay = today;
        if (!weeklyFresh) gw2Api._wvCacheMeta.weeklyWeek = isoWeek;
        if (!specialValid) gw2Api._wvCacheMeta.specialExpiry = Date.now() + 7*24*60*60*1000; // 7 days heuristic
        gw2Api._dailyMetaNameById = nameById;
    console.log('Updated WV boss/meta mapping:', gw2Api.dailyBossIdMap, 'from metas:', metas.length, 'scopes:', gw2Api.wvScopeByAchId);

        if (Object.keys(map).length === 0 && metas.length === 0) {
            showApiStatus('No WV boss/meta achievements resolved (API format?)', 'success');
        }
    } catch (e) {
        console.error('Error building daily boss mapping', e);
    showApiStatus('Error building WV objective mapping', 'error');
    }
}

function resetEventStates() {
    // Reset all done states when API key is cleared
    allEvents.forEach(event => {
        const doneCheckbox = document.getElementById(`dcb-${event.parentEvent.key}`);
        if (doneCheckbox) doneCheckbox.checked = false;
        if (event.card) {
            event.card.classList.remove('done');
            const badge = event.card.querySelector('.api-badge');
            if (badge) badge.remove();
        }
    });
}

// Initialize everything when DOM is loaded
function initializeApp() {
    console.log('Initializing app...');
    initializeApiInterface();
    // Daily reset clearing for API badges & done states if past reset
    const lastSync = localStorage.getItem('gw2-last-api-sync');
    if (isAfterDailyReset(lastSync)) {
        console.log('Daily reset detected - clearing API-completed states');
        resetEventStates();
    }
    initBackgroundStyleToggle();
    // Hook up manual re-scan button
    const rescanBtn = document.getElementById('api-daily-rescan');
    if (rescanBtn) {
        rescanBtn.addEventListener('click', async () => {
            const autoMarkEnabled = JSON.parse(localStorage.getItem('auto-mark-enabled') || 'true');
            if (!autoMarkEnabled) { showToast('Enable auto-mark first'); return; }
            const todayKey = new Date().toISOString().slice(0,10);
            localStorage.removeItem(`daily-meta-${todayKey}`);
            // Invalidate freshness flags but retain existing mapping so we can detect which are actually new this scan
            gw2Api.dailyBossBuildDay = null;
            gw2Api._wvCacheMeta.dailyDay = null;
            gw2Api._wvCacheMeta.weeklyWeek = null;
            gw2Api._wvCacheMeta.specialExpiry = 0;
            gw2Api.dailyUnavailable = false; // allow retries after manual intervention
            if (!gw2Api.achievements && gw2Api.apiKey) {
                await gw2Api.fetchAchievements();
            }
            showApiStatus('Re-scanning daily API...', 'loading');
            const beforeKeys = new Set(Object.keys(gw2Api.dailyBossIdMap));
            // Force all scopes so weekly meta patterns are re-evaluated
            await buildDailyBossMappingIfNeeded({forceAllScopes:true});
            const afterKeys = new Set(Object.keys(gw2Api.dailyBossIdMap));
            updateEventStatesFromAPI();
            const newMatches = [...afterKeys].filter(k => !beforeKeys.has(k));
            const total = afterKeys.size;
            if (gw2Api.dailyUnavailable) {
                showToast('Daily API still unavailable');
            } else {
                if (total === 0) {
                    const hadWeeklyObj = Object.values(gw2Api._wvObjectivesById).some(o => o && o._wvScope === 'weekly');
                    if (hadWeeklyObj) {
                        showToast('WV scan: 0 matches (no recognized meta titles)');
                    } else {
                        showToast('WV scan: 0 matches (no WV objectives loaded)');
                    }
                } else if (newMatches.length === 0) {
                    showToast(`WV scan: ${total} matches (no new)`);
                } else {
                    showToast(`WV scan: ${total} matches (+${newMatches.length} new)`);
                }
            }
        });
    }

    // Initialize What's New modal after base UI
    initWhatsNewModal();

    // Manage API help details overflow to avoid clipping
    const apiContent = document.getElementById('api-content');
    const apiHelpDetails = apiContent ? apiContent.querySelector('.api-help details') : null;
    if (apiContent && apiHelpDetails) {
        apiHelpDetails.addEventListener('toggle', () => {
            if (apiHelpDetails.open) apiContent.classList.add('api-content--overflow');
            else apiContent.classList.remove('api-content--overflow');
        });
    }

    // Start background weekly WV watcher
    initWeeklyWVWatcher();
}

// Call initialization when script loads (modules are deferred, so DOM is ready)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM already loaded
    initializeApp();
}

// Background style toggle logic
function initBackgroundStyleToggle(){
    const container = document.getElementById('appearance-options');
    if (!container) return;
    const saved = localStorage.getItem('bg-style') || 'generated';
    if (saved === 'plain') document.body.classList.add('plain-background');
    container.querySelectorAll('input[name="bg-style"]').forEach(radio => {
        if (radio.value === saved) radio.checked = true;
        radio.addEventListener('change', () => {
            localStorage.setItem('bg-style', radio.value);
            if (radio.value === 'plain') {
                document.body.classList.add('plain-background');
            } else {
                document.body.classList.remove('plain-background');
            }
            // Reapply / clear per existing cards
            document.querySelectorAll('.event-card-element').forEach(wrapper => {
                const key = wrapper.getAttribute('data-event-key');
                const card = wrapper.querySelector('.event-card');
                if (!card || !key) return;
                const parent = getObjByKey(events.parentEvents, key);
                if (parent) applyProceduralBackground(card, parent.categoryKey);
            });
        });
    });

    // Regenerate button logic
    const regenBtn = document.getElementById('bg-regenerate');
    if (regenBtn) {
        regenBtn.addEventListener('click', () => {
            // Remove cached backgrounds from localStorage
            Object.keys(localStorage).filter(k => k.startsWith('bg-')).forEach(k => localStorage.removeItem(k));
            // Clear in-memory cache
            for (const k in proceduralBackgroundCache) { delete proceduralBackgroundCache[k]; }
            // Reapply if generated mode
            const style = localStorage.getItem('bg-style') || 'generated';
            if (style === 'generated') {
                document.querySelectorAll('.event-card-element').forEach(wrapper => {
                    const key = wrapper.getAttribute('data-event-key');
                    const card = wrapper.querySelector('.event-card');
                    if (!card || !key) return;
                    const parent = getObjByKey(events.parentEvents, key);
                    if (parent) applyProceduralBackground(card, parent.categoryKey);
                });
            }
            showToast('Backgrounds regenerated');
        });
    }
}

// ---------------- What's New Modal Logic ----------------
function initWhatsNewModal() {
    const overlay = document.getElementById('whats-new-overlay');
    const modal = document.getElementById('whats-new-modal');
    if (!overlay || !modal) return;
    const closeBtn = document.getElementById('wn-close');
    const hideSessionBtn = document.getElementById('wn-hide-session');
    const dontShowBtn = document.getElementById('wn-dont-show');
    const verEl = document.getElementById('wn-version');
    if (verEl) verEl.textContent = `Version: ${WHATS_NEW_VERSION}`;

    const dismissed = localStorage.getItem('whats-new-dismissed-version');
    if (dismissed === WHATS_NEW_VERSION) return; // Already acknowledged

    function openModal() {
        overlay.classList.remove('hidden');
        modal.classList.remove('hidden');
        overlay.setAttribute('aria-hidden','false');
        setTimeout(() => { dontShowBtn?.focus(); }, 50);
    }
    function closeModal(persist) {
        overlay.classList.add('hidden');
        modal.classList.add('hidden');
        overlay.setAttribute('aria-hidden','true');
        if (persist) {
            try { localStorage.setItem('whats-new-dismissed-version', WHATS_NEW_VERSION); } catch {}
        }
    }

    closeBtn?.addEventListener('click', () => closeModal(false));
    hideSessionBtn?.addEventListener('click', () => closeModal(false));
    dontShowBtn?.addEventListener('click', () => closeModal(true));
    overlay?.addEventListener('click', (e) => { if (e.target === overlay) closeModal(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal(false); });

    openModal();
}

// Background watcher: detect weekly WV reset (Monday) and refresh mapping automatically
function initWeeklyWVWatcher() {
    const CHECK_INTERVAL_MS = 10 * 60 * 1000; // every 10 minutes
    let lastIsoWeek = gw2Api._wvCacheMeta.weeklyWeek || null;
    let triggeredForWeek = lastIsoWeek; // avoid duplicate toasts per week

    function isoWeekString(d){
        const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay()||7));
        const yearStart = new Date(Date.UTC(dt.getUTCFullYear(),0,1));
        const weekNo = Math.ceil((((dt - yearStart) / 86400000) + 1)/7);
        return `${dt.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`;
    }

    async function checkWeekly() {
        // Only run if auto-mark enabled & API key present
        const autoMarkEnabled = JSON.parse(localStorage.getItem('auto-mark-enabled') || 'true');
        if (!autoMarkEnabled || !gw2Api.apiKey) return;
        const now = new Date();
        const isoWeek = isoWeekString(now);
        if (isoWeek !== lastIsoWeek) {
            // Weekly rolled over; rebuild mapping focusing weekly scope
            console.log('[WV] Weekly rollover detected. Refreshing weekly metas.');
            await buildDailyBossMappingIfNeeded();
            updateEventStatesFromAPI();
            if (triggeredForWeek !== isoWeek) {
                showToast('Weekly WV metas refreshed');
                triggeredForWeek = isoWeek;
            }
            lastIsoWeek = isoWeek;
        }
    }

    // Initial schedule
    setInterval(checkWeekly, CHECK_INTERVAL_MS);
    // Also run a light delayed first check to catch active Monday sessions
    setTimeout(checkWeekly, 15 * 1000);
}

