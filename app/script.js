let eventData = await fetch('/app/eventData.json')
    .then(response => response.json())
    .then(obj => { return obj })
    .catch(error => console.error("Culd not fetch EventData", error));

const eventTable = document.getElementById("event-table")
const cardTemplate = document.getElementById("event-card-template")
const toggleTemplate = document.getElementById("tgl-template")
let allEvents = []

//
let now = new Date();
const minCountdownTime = 900000
const maxFutureCardTime = 5*3600000

class event {
    constructor(eventData, startTimeStr) {
        this.parentEventID = eventData.Name.replaceAll(" ", "-")
        this.eventid = startTimeStr+this.parentEventID
        this.name = eventData.Name
        this.map = eventData.Map
        this.waypoint = eventData.Waypoint
        this.wiki = eventData.Wiki
        this.localStartTime = getLocalTime(startTimeStr)
        this.category = eventData.Category
        if (this.localStartTime < now) {this.localStartTime.setDate(this.localStartTime.getDate() +1 )}
    }
    addEventToDOM() {
        if (this.localStartTime > now.getTime() + maxFutureCardTime) {return}

        let clone = cardTemplate.content.cloneNode(true)

        clone.querySelector(".event-card-element").classList.add(this.parentEventID)
        clone.querySelector(".event-card-element").classList.add(this.category)
        clone.querySelector(".event-card-element").id =  this.eventid
        clone.querySelector(".waypoint-link").id =  `wp${this.eventid}`
        clone.querySelector(".remaining-time").id = `rt-${this.eventid}`
        clone.querySelector(".wiki-link").href = this.wiki
        clone.querySelector(".event-start-time").textContent = getTimeAsStr(this.localStartTime)
        clone.querySelector(".event-name").textContent = this.name
        clone.querySelector(".event-map").textContent = this.map

        eventTable.appendChild(clone)

        let wp = document.getElementById(`wp${this.eventid}`)
        wp.addEventListener("click", () => {  navigator.clipboard.writeText(this.waypoint)    })
        wp.classList.add(this.category)

        let card = document.getElementById(this.eventid)
        let visibility = getVisibility(this.parentEventID)
        toggleVisibility(card, visibility)

    }
    updateCard() {
        let card = document.getElementById(this.eventid)
        if (!card) {this.addEventToDOM(); return}
        let remainingMS = this.localStartTime - now
        if (remainingMS < 0) {
            card.remove()
            this.localStartTime.setDate(this.localStartTime.getDate() +1)
            console.log(this)
            console.log(allEvents)
            return}
        if (remainingMS < minCountdownTime) {  this.updateCountDown(remainingMS) }
    }
    updateCountDown(remainingMS) {
        let div = document.getElementById(`rt-${this.eventid}`)
        let m = Math.floor((remainingMS % (1000*60*60))/(1000*60));
        let s = Math.floor((remainingMS % (1000*60))/(1000));
        let sStr = String(s).padStart(2,"0");
        div.textContent = m + ":" + sStr
    }
}

// Add Event Toggles
for (let i = 0; i < eventData.length; i++) {
    addVisibilityTgl(eventData[i])
    for (let j = 0; j < eventData[i].uctZeroStartTime.length; j++) {
        let evt = new event(eventData[i], eventData[i].uctZeroStartTime[j])
        allEvents.push(evt)
    }
}

//Sort All Events
allEvents.sort((a, b) => a.localStartTime - b.localStartTime)

// Add Event Cards
for (let i = 0; i < allEvents.length; i++) {
    allEvents[i].addEventToDOM()
}

//Update
setInterval(interval, 1000)
function interval(){
    now = new Date();
    updateEventCards()

}

function addVisibilityTgl(eventData) {
    let clone = toggleTemplate.content.cloneNode(true)
    let parentEventID = eventData.Name.replaceAll(" ", "-")

    clone.querySelector(".tgl-label").textContent = eventData.Name
    clone.querySelector(".tgl-checkbox").checked = getVisibility(parentEventID)
    clone.querySelector(".tgl-checkbox").id = `cb-${parentEventID}`
    clone.querySelector(".tgl-label").htmlFor = `cb-${parentEventID}`


    const tglList = document.getElementById(eventData.Category)
    tglList.appendChild(clone)

    let tgl = document.getElementById(`cb-${parentEventID}`)
    tgl.addEventListener("change", (e) => {
        setVisibility(parentEventID, e.target.checked)
        let elements = document.getElementsByClassName(parentEventID)
        toggleVisibility(elements, e.target.checked)
        umami.track(`Toggeled: ${eventData.Name} ${e.target.checked}`)
    })
}

function getVisibility(parentEventID) {
    let value = localStorage.getItem(parentEventID)
    if (value === "false") {return false}
    return true
}

function setVisibility(parentEventID, value) {
    if (value === false) {localStorage.setItem(parentEventID, "false")}
    if (value === true) {localStorage.removeItem(parentEventID)}
}

function toggleVisibility(elements, visibility) {
    if ( !HTMLCollection.prototype.isPrototypeOf(elements) ) {elements = [elements]}

    if (visibility === true) {
        for (let i = 0; i < elements.length; i++) {
            elements[i].style.display = "flex";
        }
    }
    if (visibility === false) {
        for (let i = 0; i < elements.length; i++) {
            elements[i].style.display = "none";
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
    let min = String(time.getMinutes()).padEnd(2, "0")
    return `${hours}:${min}`
}

function updateEventCards() {
    for (let i = 0; i < allEvents.length; i++) {
        allEvents[i].updateCard()
    }
}

function tomorowSameTime(Date){
    date
}