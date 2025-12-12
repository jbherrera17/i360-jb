/**
 * Theme Toggle - Insight 360
 * Handles dark/light mode switching with localStorage persistence
 */

(function() {
    // Apply saved theme immediately to prevent flash
    const savedTheme = localStorage.getItem('insight360-theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
})();

document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    
    if (!themeToggle) return;
    
    // Get current theme
    const currentTheme = localStorage.getItem('insight360-theme') || 'dark';
    
    // Set initial state
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.checked = currentTheme === 'light';
    
    // Handle toggle
    themeToggle.addEventListener('change', function() {
        const newTheme = this.checked ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('insight360-theme', newTheme);
    });
});