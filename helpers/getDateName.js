// @ts-ignore
exports.getDateName =  (dateStr) => {
    const dateObj = new Date(`${dateStr}T00:00:00`)

    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' })
    return dayName;
}