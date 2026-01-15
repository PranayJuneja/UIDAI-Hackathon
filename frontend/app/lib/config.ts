/**
 * Centralized API Configuration
 * 
 * All API URLs should be imported from this file to allow easy
 * configuration via environment variables for different deployments.
 */

// Backend API base URL (REST endpoints)
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000';

// WebSocket base URL
export const WS_BASE = process.env.NEXT_PUBLIC_WS_BASE || 'ws://localhost:8000';

// WebSocket chat endpoint (handle trailing slash in WS_BASE)
export const WS_CHAT_URL = `${WS_BASE.replace(/\/$/, '')}/ws/chat`;

// WebSocket terminal chat endpoint (lightweight, for district view)
export const WS_TERMINAL_URL = `${WS_BASE.replace(/\/$/, '')}/ws/terminal-chat`;

// WebSocket copilot endpoint (comprehensive, fast global chat)
export const WS_COPILOT_URL = `${WS_BASE.replace(/\/$/, '')}/ws/copilot`;

// Request timeout in milliseconds
export const REQUEST_TIMEOUT_MS = 10000;

// GeoJSON CDN base URL (external dependency)
export const GEOJSON_CDN_BASE = process.env.NEXT_PUBLIC_GEOJSON_CDN ||
    'https://cdn.jsdelivr.net/gh/udit-001/india-maps-data@main/geojson/states';

// Cache TTL in milliseconds (5 minutes)
export const CACHE_TTL_MS = 5 * 60 * 1000;
