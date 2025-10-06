$(() => ready())

async function ready() {
    setupSyncButton()
}

function setupSyncButton() {
    $('#sync-button').click(async () => {
        const configId = $('#recurring-events-id').val()

        // Hide previous results
        $('#sync-status').hide()
        $('#sync-error').hide()

        // Show loading
        $('#loading-screen').css('display', 'flex')
        $('#sync-button').addClass('disabled')

        try {
            const response = await axios.put(`/recurring-events/${configId}/sync`)

            if (response.data.success) {
                // Show success message
                const result = response.data
                let message = `Sync completed successfully!`

                $('#sync-status-message').text(message)

                const details = []
                if (result.created > 0) details.push(`Created: ${result.created}`)
                if (result.updated > 0) details.push(`Updated: ${result.updated}`)
                if (result.skipped > 0) details.push(`Skipped: ${result.skipped}`)
                if (result.errors && result.errors.length > 0) {
                    details.push(`Errors: ${result.errors.length}`)
                    result.errors.forEach(err => {
                        details.push(`  - ${err}`)
                    })
                }

                $('#sync-status-details').empty()
                details.forEach(detail => {
                    $('#sync-status-details').append(`<li>${detail}</li>`)
                })

                $('#sync-status').show()

                M.toast({
                    html: 'Sync completed!',
                    classes: 'green lighten-1',
                    displayLength: 3000
                })

                // Reload page after a delay to show updated last sync time
                setTimeout(() => {
                    location.reload()
                }, 3000)

            } else {
                throw new Error(response.data.error || 'Unknown error')
            }

        } catch (error) {
            console.error('Sync error:', error)
            const errorMessage = error.response?.data?.error || error.message || 'Failed to sync'

            $('#sync-error-message').text(errorMessage)
            $('#sync-error').show()

            M.toast({
                html: `Sync failed: ${errorMessage}`,
                classes: 'red lighten-1',
                displayLength: 5000
            })

        } finally {
            $('#loading-screen').css('display', 'none')
            $('#sync-button').removeClass('disabled')
        }
    })
}
