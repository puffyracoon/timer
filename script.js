let events = await fetch('/timer/events.json')
    .then(response => response.json())
    .then(obj => { return obj })
    .catch(error => console.error("Could not fetch event data: ", error));
let alertSound = new Audio("/timer/assets/alert.mp3");

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
        const eventName = card.querySelector('.event-name').textContent.toLowerCase()
        const eventMap = card.querySelector('.event-map').textContent.toLowerCase()
        const isFavorite = card.querySelector('.favorite-star').classList.contains('favorited')
        
        // Check if event has active alerts (reminder set)
        const reminderElement = card.querySelector('.reminder-link')
        const hasActiveAlert = reminderElement && reminderElement.textContent.trim() !== ""
        
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
    const allEventCards = document.querySelectorAll(`[data-event-key="${eventKey}"]`)
    allEventCards.forEach(card => {
        const favoriteStar = card.querySelector('.favorite-star')
        if (favoriteStar) {
            if (!isFavorited) { // Now favorited
                favoriteStar.classList.add('favorited')
                favoriteStar.textContent = '★'
            } else { // No longer favorited
                favoriteStar.classList.remove('favorited')
                favoriteStar.textContent = '☆'
            }
        }
    })
    
    filterEvents()
}

function sendNotification(eventName, timeRemaining) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`GW2 Event Starting Soon!`, {
            body: `${eventName} starts in ${timeRemaining}`,
            icon: '/timer/assets/Event_star_(map_icon).png',
            tag: eventName // Prevents duplicate notifications
        })
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
        
        // Map events to their daily achievement IDs for auto-completion
        this.eventAchievementMap = {
            'ShadowBehemoth': [1840, 1899], // Daily Shadow Behemoth
            'FireElemental': [1841, 1900], // Daily Fire Elemental  
            'SvanirShamanChief': [1842, 1901], // Daily Svanir Shaman Chief
            'GreatJungleWurm': [1843, 1902], // Daily Great Jungle Wurm
            'GolemMarkII': [1844, 1903], // Daily Golem Mark II
            'TheShatterer': [1845, 1904], // Daily The Shatterer
            'TequatltheSunless': [573, 1846], // Daily Tequatl the Sunless
            'TripleTroubleWurm': [1847, 1905], // Daily Triple Trouble
            'EvolvedJungleWurm': [1848, 1906], // Daily Evolved Jungle Wurm
            'KarkaQueen': [1849, 1907], // Daily Karka Queen
            'ClawofJormag': [1850, 1908], // Daily Claw of Jormag
            'Doppelganger': [1851, 1909], // Daily Doppelganger
        };
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
        if (!this.achievements || !this.eventAchievementMap[eventKey]) {
            return false;
        }
        
        const achievementIds = this.eventAchievementMap[eventKey];
        
        // Check if any of the mapped achievements are completed
        return achievementIds.some(achievementId => {
            const achievement = this.achievements.find(a => a.id === achievementId);
            return achievement && achievement.done;
        });
    }
    
    // Get all completed events for today
    getCompletedEvents() {
        if (!this.achievements) return [];
        
        const completedEvents = [];
        for (const [eventKey, achievementIds] of Object.entries(this.eventAchievementMap)) {
            if (this.isEventCompleted(eventKey)) {
                completedEvents.push(eventKey);
            }
        }
        return completedEvents;
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
const minTimeToShowCountdown = 20 * 60 * 1000
const maxTimeToShowCards = 5 * 60 * 60 * 1000

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
        clone.querySelector(".event-card-element").id =  this.eventid
        clone.querySelector(".event-card-element").classList.add(this.parentEvent.key)
        clone.querySelector(".event-card-element").setAttribute('data-event-key', this.parentEvent.key)
        clone.querySelector(".event-card-element").style.borderColor =  this.color
        // Set category color as CSS custom property for hover effects
        clone.querySelector(".event-card-element").style.setProperty('--category-color', this.color)
        clone.querySelector('.done-icon').classList.add(`di-${this.parentEvent.key}`)
        clone.querySelector(".wiki-link").href = this.parentEvent.wiki
        clone.querySelector(".fastf-link").href = this.parentEvent.fastF
        clone.querySelector(".event-start-time").textContent = getTimeAsStr(this.localStartTime)
        clone.querySelector(".event-name").textContent = this.parentEvent.name
        clone.querySelector(".note").textContent = this.parentEvent.note
        clone.querySelector(".event-map").textContent = this.event.map

        // Set up favorite star
        const favoriteStar = clone.querySelector(".favorite-star")
        if (favoriteEvents.includes(this.parentEvent.key)) {
            favoriteStar.classList.add('favorited')
            favoriteStar.textContent = '★'
        }
        favoriteStar.addEventListener('click', () => {
            toggleFavorite(this.parentEvent.key)
        })

        // Set up chain start indicator
        const chainIndicator = clone.querySelector(".chain-start-indicator")
        if (this.isChainStartEvent()) {
            chainIndicator.style.display = 'flex'
        }

        eventTable.appendChild(clone)
        this.card = document.getElementById(this.eventid)

        // Waypoint Link
        let wp = this.card.querySelector(".waypoint-link")
        let copy = `${getTimeAsStr(this.localStartTime)} || ${this.parentEvent.name} || ${this.event.waypoint}`
        wp.addEventListener("click", () => {  
            navigator.clipboard.writeText(copy)
            // Show toast notification
            showToast('Waypoint copied to clipboard')
        })

        //Reminder Link
        let rl = this.card.querySelector(".reminder-link")
        rl.addEventListener("click", () => { updateAlert(this) } )
        rl.addEventListener("mouseover", () => { rl.style.backgroundColor = this.color || "var(--accent-color)" } )
        rl.addEventListener("mouseout", () => { rl.style.backgroundColor = "var(--alt-bg-color)" } )
        
        // Set initial reminder display based on localStorage
        if (this.reminderMSbeforEvent === "no") {
            rl.textContent = ""
            let icon = document.createElement('div')
            icon.className = 'reminder-icon'
            icon.alt = "Reminder switch 2 5 10 Minutes"
            rl.appendChild(icon)
        } else if (this.reminderMSbeforEvent === 2 * 60000) {
            rl.textContent = "2m"
        } else if (this.reminderMSbeforEvent === 5 * 60000) {
            rl.textContent = "5m"
        } else if (this.reminderMSbeforEvent === 10 * 60000) {
            rl.textContent = "10m"
        }

        // [fast] FarmingLink
        if (this.parentEvent.fastF === "") {
            this.card.querySelector(".fastf-link").style.visibility = "hidden"
        }

        //Done Link
        let dl = this.card.querySelector(".done-link")
        let toggleCheckbox = document.getElementById(`dcb-${this.parentEvent.key}`)
        dl.addEventListener("click", () => {
            toggleCheckbox.click()
            // Update icon state
            const icon = dl.querySelector('.done-icon')
            if (toggleCheckbox.checked) {
                icon.classList.add('completed')
            } else {
                icon.classList.remove('completed')
            }
        } )

        if (toggleCheckbox.checked) {
            this.card.querySelector(".done-icon").classList.add('completed')
        }

        //Toggle Visibility based on localStorage Settings
        let visibility = getVisibilityFromLocalStorage(this.parentEvent.key)
        toggleVisibility(this.parentEvent.key, visibility)

        // Add smart tooltip positioning
        this.setupSmartTooltips()

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
        if (this.remainingMS < minTimeToShowCountdown) {
            this.updateCountDown()
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
    try {
        umami.track(`revisited with disabled events`)
    } catch (err) {
        console.log(err)
    }
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
        try {
            umami.track(`Toggled ${parentEventKey} ${visibility}`)
        } catch (err){
            console.log(err)
        }
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
            e.src = "/timer/assets/done_outline_FFFFFF.svg"
            localStorage.removeItem(`done-${parentEventKey}`)
        }
    }
    if (value === true) {
        for (let e of elements) {
            e.src = "/timer/assets/done_outline_75FB4C_.svg"
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
    }

    function alert(){
        alertSound.play()

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

        try {
            umami.track(`A Gamer got notified about ${Event.parentEvent.name}`)
        } catch (err){
            console.log(err)
        }
    }
    
    // Update filters to reflect alert changes
    filterEvents()
}

// GW2 API Interface functions
function initializeApiInterface() {
    const apiKeyInput = document.getElementById('api-key-input');
    const apiKeySave = document.getElementById('api-key-save');
    const apiKeyClear = document.getElementById('api-key-clear');
    const apiRefresh = document.getElementById('api-refresh');
    const apiStatus = document.getElementById('api-status');

    // Debug: Check if elements exist
    console.log('API Elements found:', {
        input: !!apiKeyInput,
        save: !!apiKeySave,
        clear: !!apiKeyClear,
        refresh: !!apiRefresh,
        status: !!apiStatus
    });

    if (!apiKeyInput || !apiKeySave || !apiKeyClear || !apiRefresh || !apiStatus) {
        console.error('Some API elements not found in DOM');
        return;
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
            
            // Fetch achievements for future use
            await gw2Api.fetchAchievements();
            
            // Update event states based on API data
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

    // Refresh achievements and update events
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
}

function updateEventStatesFromAPI() {
    console.log('Updating event states from GW2 API...');
    
    if (!gw2Api.achievements) {
        console.log('No achievement data available');
        return;
    }
    
    console.log(`Checking ${gw2Api.achievements.length} achievements for completed events`);
    const completedEvents = gw2Api.getCompletedEvents();
    console.log('API detected completed events:', completedEvents);
    
    // Update event cards based on API data
    allEvents.forEach(event => {
        const isCompleted = gw2Api.isEventCompleted(event.parentEvent.key);
        const eventCard = event.card;
        const doneCheckbox = document.querySelector(`input[data-event-id="${event.eventid}"].done-checkbox`);
        
        if (eventCard && doneCheckbox) {
            if (isCompleted && !doneCheckbox.checked) {
                // Mark as done if API says it's completed
                doneCheckbox.checked = true;
                eventCard.classList.add('done');
                console.log(`✅ Auto-marked ${event.parentEvent.name} as completed via API`);
            }
        }
    });
    
    // Show status message
    if (completedEvents.length > 0) {
        showApiStatus(`Auto-marked ${completedEvents.length} completed events`, 'success');
    } else {
        showApiStatus('API connected - no events completed today', 'success');
    }
}

function resetEventStates() {
    // Reset all done states when API key is cleared
    allEvents.forEach(event => {
        const doneCheckbox = document.querySelector(`input[data-event-id="${event.eventid}"].done-checkbox`);
        if (doneCheckbox) {
            doneCheckbox.checked = false;
            event.card?.classList.remove('done');
        }
    });
}

// Initialize everything when DOM is loaded
function initializeApp() {
    console.log('Initializing app...');
    initializeApiInterface();
}

// Call initialization when script loads (modules are deferred, so DOM is ready)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM already loaded
    initializeApp();
}