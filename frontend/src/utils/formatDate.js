export const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

export const formatHour = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric'
    })
}