/* chat utils — small shared helpers */
/**
 * Helper: Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Helper: Format date as day and date (e.g., "Mon, Feb 7")
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();

    // Get day name abbreviated
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const dayOfMonth = date.getDate();
    const year = date.getFullYear();
    const currentYear = now.getFullYear();

    // If same year, don't show year
    if (year === currentYear) {
        return `${dayName}, ${monthName} ${dayOfMonth}`;
    }

    // Different year, include year
    return `${dayName}, ${monthName} ${dayOfMonth}, ${year}`;
}

/**
 * Insert prompt template
 */
function insertPrompt(text) {
    if (chatInput) {
        chatInput.value = text + ' ';
        chatInput.focus();
    }
}

/**
 * Helper to download a blob
 */
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

