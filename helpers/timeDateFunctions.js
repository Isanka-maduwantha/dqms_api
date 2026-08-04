/**
 * 
 * @param {string} dateStr 
 * @param {string} timeStr 
 * @returns 
 */
function parseTimeToDate(dateStr, timeStr) {
    const [hours, minutes] = timeStr.split(':');
    const d = new Date(`${dateStr}T00:00:00`);
    d.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return d;
}

/**
 * 
 * @param {Date} dateObj 
 * @returns
 */
function formatHHMM(dateObj) {
    const h = String(dateObj.getHours()).padStart(2, '0');
    const m = String(dateObj.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

module.exports = {
    parseTimeToDate,formatHHMM
}