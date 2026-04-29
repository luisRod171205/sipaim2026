# SIPAIM 2026 - Refactored

## Overview
This is a refactored version of the SIPAIM 2026 activity scheduling application. It now uses a proper database schema with activities and options, supports admin management, and has an improved UI without popups.

## Database Setup
Run the SQL script in `supabase_schema.sql` in your Supabase SQL editor to create the required tables.

## Features
- **Activities**: Can be in 4 states: inactivo, en_espera, pendiente, cerrado
- **Options**: Each activity can have multiple options with description and extra fields (JSON)
- **Admin Module**: Separate page (`admin.html`) for creating activities and managing options
- **UI Improvements**: Wider schedule view, inline option selection, no popups
- **State Management**: Activities progress through states based on user actions

## Files
- `Index.html`: Main application
- `admin.html`: Admin interface
- `script.js`: Main app logic
- `admin.js`: Admin logic
- `styles.css`: Shared styles
- `supabase_schema.sql`: Database schema

## Usage
1. Open `admin.html` to create activities and add options
2. Open `Index.html` to view and manage the schedule
3. Activities start as "inactivo", admin can change to "en_espera" to allow selection
4. Users can select options, moving to "pendiente"
5. Admin can close activities by changing to "cerrado"</content>
<parameter name="filePath">c:\Users\saidj\Desktop\GICC\README.md