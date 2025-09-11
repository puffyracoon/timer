# GW2 Timer Fork by puffyracoon

This is a fork of [Snipppy's GW2 Simple Timer](https://github.com/Snipppppy/GW2-Simple-Timer/) with additional functionality.

## New Features Added in This Fork

### ⭐ Wizard Vault Integration
- **Automatic event highlighting**: Meta events from your weekly Wizard Vault objectives get golden glow and star indicators
- **Smart progress tracking**: Highlights disappear automatically when objectives are completed (based on progress_current/progress_complete)
- **Dynamic matching**: Intelligent system automatically matches any meta event without manual updates
- **GW2 API integration**: Uses your API key to fetch weekly objectives in real-time
- **Smart filtering**: Ignores generic objectives like "Complete 10 events"
- **Visual excellence**: Beautiful golden animations and star markers for enhanced UX

### 🔍 Real-time Search
- **Live event search**: Search for events by name or map location
- **Instant filtering**: Events that don't match are hidden from view
- **Visual highlighting**: Matching events get a red glow effect
- **Preserves expansion colors**: Search doesn't interfere with the color-coded event cards

### 🎛️ Enhanced Toggle Controls
- **Toggle All button**: Quickly enable all event categories at once
- **Toggle None button**: Quickly disable all event categories at once
- **Convenient placement**: Located at the top of the filter menu for easy access

### 🌊 New Meta Event
- **A Titanic Voyage**: Added the new meta event from Janthir Wilds expansion
- **Complete scheduling**: Includes all timing and map information
- **Proper categorization**: Correctly placed in the Janthir Wilds category

### 🎨 UI/UX Improvements
- **Centered search bar**: Clean, accessible search input in the header
- **Preserved styling**: Maintains the original design aesthetic
- **Better user flow**: More intuitive event discovery and management

### 🧹 Code Cleanup
- **Updated attribution**: Proper fork credits and links to both repositories

## Links

### This Fork
- **Repository**: https://github.com/puffyracoon/timer/
- **Live Demo**: https://puffyracoon.github.io/timer/

### Original Project
- **Creator**: Snipppy
- **Repository**: https://github.com/Snipppppy/GW2-Simple-Timer/
- **Live Demo**: https://gw2timer.snipppy.de/

## Installation
1. Clone this repository
2. Run a local HTTP server (e.g., `python -m http.server 3000`)
3. Open `http://localhost:3000` in your browser

## GitHub Pages
This fork is configured to work with GitHub Pages for easy deployment.

## Additional Features in This Fork

### 🔑 GW2 API Key Integration & Wizard Vault
- **API key storage**: Secure local storage of your Guild Wars 2 API key
- **Wizard Vault integration**: Automatically highlights meta events from weekly objectives
- **Smart event detection**: Dynamic matching system works with any meta event
- **Progress-aware highlighting**: Visual indicators automatically disappear when objectives are completed
- **Real-time updates**: Reflects your actual progress (e.g., 3/5 events completed)
- **Visual indicators**: Golden glow and star markers for Wizard Vault events
- **Auto-refresh**: Updates immediately when API key is saved
- **Intelligent caching**: 1-hour cache to minimize API calls
- **Error handling**: Graceful fallback if API is unavailable
- **Future-proof**: No manual updates needed for new meta events

### 🔔 Persistent Reminders
- **Saved alerts**: Reminder settings now persist across browser sessions
- **Auto-restore**: Page reloads maintain your alert preferences
- **Smart cleanup**: Expired reminders are automatically removed
- **Seamless experience**: No more lost reminder settings

### 🌊 Updated Meta Events
- **The Gang War of Echovald**: Updated with proper name and 40-minute duration
- **The Battle for the Jade Sea**: Updated with proper name and 60-minute duration
- **Accurate scheduling**: All events include correct timing and map information

### 🧹 Code Cleanup
- **Removed analytics**: No more umami tracking calls for privacy
- **Asset path fixes**: All paths converted to relative for GitHub Pages compatibility

---

*This fork maintains all original functionality while adding the enhancements listed above.*