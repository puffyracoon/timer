let events = await fetch('app/events.json')
    .then(response => response.json())
    .then(obj => { return obj })
    .catch(error => console.error("Could not fetch event data: ", error));
let alertSound = new Audio("app/assets/alert.mp3");

const eventTable = document.getElementById("event-table")
const cardTemplate = document.getElementById("event-card-template")
const toggleTemplate = document.getElementById("tgl-template")
const categoryList = document.getElementById("category-list")
const categoryTemplate = document.getElementById("tgl-category-template")

let allEvents = []

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
        this.reminderMSbeforEvent = "no"
        this.remainingMS = null
        this.timeoutID = null
        this.intervalID = null
        this.card = null
        
        // Load saved reminder setting
        const savedReminders = loadReminderSettings();
        if (savedReminders[this.eventid]) {
            this.reminderMSbeforEvent = savedReminders[this.eventid];
        }
    }
    addEventToDOM() {
        let clone = cardTemplate.content.cloneNode(true)
        clone.querySelector(".event-card-element").id =  this.eventid
        clone.querySelector(".event-card-element").classList.add(this.parentEvent.key)
        clone.querySelector(".event-card-element").style.borderColor =  this.color
        clone.querySelector('.done-icon').classList.add(`di-${this.parentEvent.key}`)
        clone.querySelector(".wiki-link").href = this.parentEvent.wiki
        clone.querySelector(".fastf-link").href = this.parentEvent.fastF
        clone.querySelector(".event-start-time").textContent = getTimeAsStr(this.localStartTime)
        clone.querySelector(".event-name").textContent = this.parentEvent.name
        clone.querySelector(".note").textContent = this.parentEvent.note
        clone.querySelector(".event-map").textContent = this.event.map

        eventTable.appendChild(clone)
        this.card = document.getElementById(this.eventid)

        // Waypoint Link
        let wp = this.card.querySelector(".waypoint-link")
        let copy = `${getTimeAsStr(this.localStartTime)} || ${this.parentEvent.name} || ${this.event.waypoint}`
        wp.addEventListener("click", () => {  navigator.clipboard.writeText(copy)    })

        //Reminder Link
        let rl = this.card.querySelector(".reminder-link")
        rl.addEventListener("click", () => { updateAlert(this) } )
        rl.addEventListener("mouseover", () => { rl.style.backgroundColor = "var(--accent-color)" } )
        rl.addEventListener("mouseout", () => { rl.style.backgroundColor = "var(--alt-bg-color)" } )
        
        // Restore saved reminder state
        this.restoreReminderDisplay();

        // [fast] FarmingLink
        if (this.parentEvent.fastF === "") {
            this.card.querySelector(".fastf-link").style.visibility = "hidden"
        }

        //Done Link
        let dl = this.card.querySelector(".done-link")
        let toggleCheckbox = document.getElementById(`dcb-${this.parentEvent.key}`)
        dl.addEventListener("click", () => {
            toggleCheckbox.click()
        } )

        if (toggleCheckbox.checked) {
            this.card.querySelector(".done-icon").src = "app/assets/done_outline_75FB4C_.svg"
        }

        //Toggle Visibility based on localStorage Settings
        let visibility = getVisibilityFromLocalStorage(this.parentEvent.key)
        toggleVisibility(this.parentEvent.key, visibility)
    }
    
    restoreReminderDisplay() {
        if (this.reminderMSbeforEvent !== "no") {
            const element = this.card.querySelector(".reminder-link");
            const minutes = this.reminderMSbeforEvent / 60000;
            element.textContent = `${minutes}m`;
            
            // Set up the reminder if the event hasn't passed and there's enough time
            if (this.remainingMS > 0 && this.remainingMS > this.reminderMSbeforEvent) {
                const reminderInMS = this.remainingMS - this.reminderMSbeforEvent;
                this.timeoutID = setTimeout(() => { 
                    this.triggerAlert();
                }, reminderInMS);
            }
        }
    }
    
    triggerAlert() {
        alertSound.play();
        let element = this.card.querySelector(".reminder-link");
        let x = 0;
        this.intervalID = setInterval(() => {
            if (x === 0) { element.style.backgroundColor = "var(--accent-color)"; x=1}
            else { element.style.backgroundColor = "var(--alt-bg-color)"; x=0}
        }, 500);
    }

    updateCard() {
        this.remainingMS = this.localStartTime - now
        if (this.localStartTime > now.getTime() + maxTimeToShowCards) {return}
        if (!this.card) {this.addEventToDOM()}
        if (this.remainingMS < minTimeToShowCountdown) {this.updateCountDown()}
        if (this.remainingMS < 0) {
            this.card.remove()
            this.localStartTime.setDate(this.localStartTime.getDate() +1)
            clearInterval(this.intervalID)
        }
    }
    updateCountDown() {
        let element = this.card.querySelector(".remaining-time")
        let min = Math.floor((this.remainingMS % (1000*60*60))/(1000*60));
        let sec = Math.floor((this.remainingMS % (1000*60))/(1000));
        let secStr = String(sec).padStart(2,"0");
        element.textContent = min + ":" + secStr
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

// Initialize Wizard Vault data on page load
updateWizardVaultStatus();

// Reminder persistence functions
function saveReminderSettings() {
    const reminderData = {};
    allEvents.forEach(event => {
        if (event.reminderMSbeforEvent !== "no") {
            reminderData[event.eventid] = event.reminderMSbeforEvent;
        }
    });
    localStorage.setItem('gw2-reminder-settings', JSON.stringify(reminderData));
}

function loadReminderSettings() {
    const savedData = localStorage.getItem('gw2-reminder-settings');
    if (savedData) {
        return JSON.parse(savedData);
    }
    return {};
}

function clearExpiredReminders() {
    const reminderData = loadReminderSettings();
    const currentTime = Date.now();
    let hasChanges = false;
    
    // Remove reminders for events that have already passed
    for (const eventId in reminderData) {
        const event = allEvents.find(e => e.eventid === eventId);
        if (event && event.remainingMS <= 0) {
            delete reminderData[eventId];
            hasChanges = true;
        }
    }
    
    if (hasChanges) {
        localStorage.setItem('gw2-reminder-settings', JSON.stringify(reminderData));
    }
}

//Hide browser-settings-alert in the SideBar
if (localStorage.length > 0) {
    document.getElementById("browser-settings-alert").remove()
}

//Add Cards to DOM
updateEventCards()

// Clear expired reminders on page load
clearExpiredReminders();

// Real-time search functionality
const searchInput = document.getElementById('event-search');
if (searchInput) {
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        
        // Reset all cards first
        document.querySelectorAll('.event-card-element').forEach(card => {
            card.style.display = '';
            card.style.boxShadow = '';
        });
        
        if (query) {
            // Hide non-matching events, show only matches
            allEvents.forEach(evt => {
                if (!evt.card) return;
                
                const eventName = evt.parentEvent.name.toLowerCase();
                const eventMap = evt.event.map.toLowerCase();
                
                if (eventName.includes(query) || eventMap.includes(query)) {
                    // Show and highlight match with glow effect only
                    evt.card.style.display = '';
                    evt.card.style.boxShadow = '0 0 20px rgba(175,36,33,0.6)';
                } else {
                    // Hide non-matches
                    evt.card.style.display = 'none';
                }
            });
        }
    });
}

// Toggle All/None functionality
document.getElementById('toggle-all').addEventListener('click', function() {
    events.categories.forEach(category => {
        const categoryToggle = document.getElementById(`catTgl-${category.key}`);
        if (categoryToggle && !categoryToggle.checked) {
            categoryToggle.click();
        }
    });
});

document.getElementById('toggle-none').addEventListener('click', function() {
    events.categories.forEach(category => {
        const categoryToggle = document.getElementById(`catTgl-${category.key}`);
        if (categoryToggle && categoryToggle.checked) {
            categoryToggle.click();
        }
    });
});

// API Key Modal functionality
const apiKeyBtn = document.getElementById('api-key-btn');
const apiKeyModal = document.getElementById('api-key-modal');
const closeModal = document.querySelector('.close');
const saveApiKeyBtn = document.getElementById('save-api-key');
const clearApiKeyBtn = document.getElementById('clear-api-key');
const cancelApiKeyBtn = document.getElementById('cancel-api-key');
const apiKeyInput = document.getElementById('api-key-input');
const apiKeyStatusText = document.getElementById('api-key-status-text');

// Load saved API key on page load
function loadApiKey() {
    const savedKey = localStorage.getItem('gw2-api-key');
    if (savedKey) {
        apiKeyInput.value = savedKey;
        apiKeyStatusText.textContent = `API key set (${savedKey.substring(0, 8)}...)`;
        apiKeyBtn.style.color = '#4CAF50'; // Green indicator
        saveApiKeyBtn.disabled = true;
        saveApiKeyBtn.textContent = 'Saved';
    } else {
        apiKeyStatusText.textContent = 'No API key set';
        apiKeyBtn.style.color = '#dddddd'; // Default text color
        saveApiKeyBtn.disabled = false;
        saveApiKeyBtn.textContent = 'Save';
    }
}

// Update save button state when input changes
function updateSaveButtonState() {
    const currentKey = apiKeyInput.value.trim();
    const savedKey = localStorage.getItem('gw2-api-key');
    
    if (currentKey === savedKey && savedKey) {
        saveApiKeyBtn.disabled = true;
        saveApiKeyBtn.textContent = 'Saved';
    } else if (currentKey) {
        saveApiKeyBtn.disabled = false;
        saveApiKeyBtn.textContent = 'Save';
    } else {
        saveApiKeyBtn.disabled = true;
        saveApiKeyBtn.textContent = 'Save';
    }
}

// Open modal
apiKeyBtn.addEventListener('click', function() {
    apiKeyModal.style.display = 'block';
    loadApiKey();
});

// Update save button state when input changes
apiKeyInput.addEventListener('input', updateSaveButtonState);

// Close modal
closeModal.addEventListener('click', function() {
    apiKeyModal.style.display = 'none';
});

cancelApiKeyBtn.addEventListener('click', function() {
    apiKeyModal.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    if (event.target === apiKeyModal) {
        apiKeyModal.style.display = 'none';
    }
});

// Save API key
saveApiKeyBtn.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
        localStorage.setItem('gw2-api-key', apiKey);
        apiKeyStatusText.textContent = `API key saved (${apiKey.substring(0, 8)}...)`;
        apiKeyBtn.style.color = '#4CAF50'; // Green indicator
        saveApiKeyBtn.disabled = true;
        saveApiKeyBtn.textContent = 'Saved';
        console.log('GW2 API key saved - fetching Wizard Vault data...');
        
        // Fetch Wizard Vault data immediately after saving API key
        updateWizardVaultStatus();
    } else {
        apiKeyStatusText.textContent = 'Please enter a valid API key';
    }
});

// Clear API key
clearApiKeyBtn.addEventListener('click', function() {
    localStorage.removeItem('gw2-api-key');
    apiKeyInput.value = '';
    apiKeyStatusText.textContent = 'API key cleared';
    apiKeyBtn.style.color = ''; // Reset to default color
    saveApiKeyBtn.disabled = true; // Disabled because input is empty
    saveApiKeyBtn.textContent = 'Save';
    console.log('GW2 API key cleared');
});

// Wizard Vault API Integration
async function fetchWizardVaultWeeklies() {
    const apiKey = localStorage.getItem('gw2-api-key');
    if (!apiKey) return null;
    
    try {
        const response = await fetch(`https://api.guildwars2.com/v2/account/wizardsvault/weekly?access_token=${apiKey}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const weeklyData = await response.json();
        console.log('Wizard Vault Weekly Data:', weeklyData);
        return weeklyData;
    } catch (error) {
        console.error('Failed to fetch Wizard Vault data:', error);
        return null;
    }
}

function parseMetaEventFromObjective(objectiveText) {
    if (!objectiveText) return null;
    
    // Filter out generic objectives that shouldn't be marked
    const genericPatterns = [
        /^Complete \d+ events?$/i,
        /^Events?$/i,
        /^Participate in \d+ events?$/i,
        /^Join \d+ events?$/i,
        /^Win \d+ events?$/i
    ];
    
    for (const pattern of genericPatterns) {
        if (pattern.test(objectiveText)) {
            return null; // Skip generic event objectives
        }
    }
    
    // Extract potential event names from objective text
    const extractedNames = [];
    
    // Common meta event patterns in Wizard Vault objectives
    const metaEventPatterns = [
        /Complete the (.+?) Meta-Event/i,
        /Participate in the (.+?) Meta-Event/i,
        /Defeat the (.+?) World Boss/i,
        /Complete (.+?) in (.+?)$/i,
        /(.+?) Meta-Event/i,
        /Complete (.+?)$/i
    ];
    
    for (const pattern of metaEventPatterns) {
        const match = objectiveText.match(pattern);
        if (match) {
            let eventName = match[1] ? match[1].trim() : match[0].trim();
            
            // Clean up the event name
            eventName = eventName.replace(/Meta-Event$/i, '').trim();
            eventName = eventName.replace(/, Events$/i, '').trim();
            eventName = eventName.replace(/^(the|a)\s+/i, '').trim();
            
            if (eventName && eventName.length > 3) {
                extractedNames.push(eventName);
            }
        }
    }
    
    // Now try to match against our actual event data dynamically
    if (extractedNames.length > 0) {
        console.log(`Extracted event names from "${objectiveText}":`, extractedNames);
        
        // Get all our event names for comparison
        const ourEvents = events.parentEvents || [];
        
        for (const extractedName of extractedNames) {
            // Try exact matches first
            for (const parentEvent of ourEvents) {
                if (parentEvent.name.toLowerCase() === extractedName.toLowerCase()) {
                    console.log(`Exact match found: "${extractedName}" -> ${parentEvent.key}`);
                    return parentEvent.key;
                }
            }
            
            // Try partial matches (both directions)
            for (const parentEvent of ourEvents) {
                const ourName = parentEvent.name.toLowerCase();
                const extractedLower = extractedName.toLowerCase();
                
                // Check if extracted name contains our event name or vice versa
                if (ourName.includes(extractedLower) || extractedLower.includes(ourName)) {
                    console.log(`Partial match found: "${extractedName}" -> ${parentEvent.key}`);
                    return parentEvent.key;
                }
                
                // Check for word-based matches (split by spaces and check overlap)
                const ourWords = ourName.split(/\s+/);
                const extractedWords = extractedLower.split(/\s+/);
                
                const commonWords = ourWords.filter(word => 
                    word.length > 3 && extractedWords.some(ew => ew.includes(word) || word.includes(ew))
                );
                
                if (commonWords.length >= 2) {
                    console.log(`Word-based match found: "${extractedName}" -> ${parentEvent.key} (common words: ${commonWords.join(', ')})`);
                    return parentEvent.key;
                }
            }
        }
        
        console.log(`No match found for extracted names:`, extractedNames);
    }
    
    return null;
}

function markWizardVaultEvents(weeklyData) {
    if (!weeklyData || !weeklyData.objectives) return;
    
    const completedObjectives = new Set();
    const activeMetaEvents = new Set();
    
    weeklyData.objectives.forEach(objective => {
        if (objective.claimed) {
            completedObjectives.add(objective.id);
            return; // Skip completed objectives
        }
        
        const metaEventKey = parseMetaEventFromObjective(objective.title);
        if (metaEventKey) {
            activeMetaEvents.add(metaEventKey);
            console.log(`Wizard Vault objective found: "${objective.title}" -> ${metaEventKey}`);
        }
    });
    
    // Apply visual indicators to matching events
    allEvents.forEach(event => {
        if (activeMetaEvents.has(event.parentEvent.key)) {
            markEventForWizardVault(event);
        }
    });
    
    // Store for persistence
    localStorage.setItem('gw2-wizard-vault-events', JSON.stringify([...activeMetaEvents]));
    localStorage.setItem('gw2-wizard-vault-completed', JSON.stringify([...completedObjectives]));
}

function markEventForWizardVault(event) {
    if (!event.card) return;
    
    // Add a distinctive border or indicator for Wizard Vault events
    event.card.style.boxShadow = '0 0 12px rgba(255, 215, 0, 0.8)'; // Golden glow
    event.card.style.borderStyle = 'dashed'; // Dashed border
    
    // Add a small indicator icon
    const indicator = event.card.querySelector('.wizard-vault-indicator');
    if (!indicator) {
        const wvIndicator = document.createElement('div');
        wvIndicator.className = 'wizard-vault-indicator';
        wvIndicator.innerHTML = '⭐'; // Star emoji for Wizard Vault
        wvIndicator.style.position = 'absolute';
        wvIndicator.style.top = '5px';
        wvIndicator.style.left = '5px';
        wvIndicator.style.fontSize = '16px';
        wvIndicator.style.zIndex = '10';
        wvIndicator.title = 'Wizard Vault Weekly Objective';
        event.card.style.position = 'relative';
        event.card.appendChild(wvIndicator);
    }
}

async function updateWizardVaultStatus() {
    const apiKey = localStorage.getItem('gw2-api-key');
    if (!apiKey) {
        console.log('No API key found, skipping Wizard Vault update');
        return;
    }
    
    const weeklyData = await fetchWizardVaultWeeklies();
    if (weeklyData) {
        markWizardVaultEvents(weeklyData);
    }
}

// Load API key status on page load
loadApiKey();

//Update cards
setInterval(interval, 1000)
function interval(){
    now = new Date();
    updateEventCards()

}

function addToggleCategory(category) {
    let clone = categoryTemplate.content.cloneNode(true)

    clone.querySelector(".categories-label").innerHTML = category.name
    clone.querySelector(".tgl-category-element").style.borderColor = category.color
    clone.querySelector(".tgl-container").id = category.key
    clone.querySelector(".category-checkbox").id = `catTgl-${category.key}`
    clone.querySelector(".category-checkbox").checked = true
    clone.querySelector(".categories-label").htmlFor = `catTgl-${category.key}`

    categoryList.appendChild(clone)

    let categoryToggle = document.getElementById(`catTgl-${category.key}`)
    categoryToggle.addEventListener("change", () => {
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
            e.src = "app/assets/done_outline_FFFFFF.svg"
            localStorage.removeItem(`done-${parentEventKey}`)
        }
    }
    if (value === true) {
        for (let e of elements) {
            e.src = "app/assets/done_outline_75FB4C_.svg"
            let ServerResetTime = new Date()
            ServerResetTime.setUTCHours(24)
            ServerResetTime.setUTCMinutes(0)
            ServerResetTime.setUTCSeconds(0)
            ServerResetTime.setUTCMilliseconds(0)
            localStorage.setItem(`done-${parentEventKey}`, ServerResetTime)
        }
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
    } else
    if (Event.reminderMSbeforEvent === 2 * 60000 ) {
        Event.reminderMSbeforEvent = 5 * 60000
        if (Event.remainingMS < Event.reminderMSbeforEvent) { setReminderToNo(); return }
        element.textContent = "5m"
        clearTimeout(Event.timeoutID)
    } else
    if (Event.reminderMSbeforEvent === 5 * 60000 ) {
        Event.reminderMSbeforEvent = 10 * 60000
        element.textContent = "10m"
        if (Event.remainingMS < Event.reminderMSbeforEvent) { setReminderToNo(); return }
        clearTimeout(Event.timeoutID)
    } else
    if (Event.reminderMSbeforEvent === 10 * 60000) {
        setReminderToNo()
        return;
    }

    let reminderInMS = Event.remainingMS - Event.reminderMSbeforEvent
    Event.timeoutID = setTimeout(()=> {alert()}, reminderInMS);
    
    // Save reminder settings
    saveReminderSettings();

    function setReminderToNo(){
        Event.reminderMSbeforEvent = "no"
        clearTimeout(Event.timeoutID)
        clearInterval(Event.intervalID)
        element.textContent = ""
        let img = document.createElement('img')
        img.src = "app/assets/notifications_off_FFFFFF.svg"
        img.alt = "Reminder switch 2 5 10 Minutes"
        element.appendChild(img)
        
        // Save reminder settings when turned off
        saveReminderSettings();
    }

    function alert(){
        alertSound.play()

        let x = 0

        let img = document.createElement("img");
        img.src = "app/assets/notifications_active_FFFFFF.svg"
        img.alt = "Reminder"
        element.textContent = ""
        element.appendChild(img)

        Event.intervalID = setInterval(()=>{blink()}, 1000)
        function blink(){
            if (x === 0) { element.style.backgroundColor = "var(--accent-color)"; x=1}
            else { element.style.backgroundColor = "var(--alt-bg-color)"; x=0}
        }
    }
}