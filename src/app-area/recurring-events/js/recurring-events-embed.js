$(() => ready())

async function ready() {
    setupEmbedSyncButton()
}

function setupEmbedSyncButton() {
    $('#embed-sync-button').click(async () => {
        const configId = $('#recurring-events-id').val()
        const $button = $('#embed-sync-button')

        // Show loading state
        $button.addClass('disabled')
        $button.html('Syncing <i class="fas fa-circle-notch fa-spin"></i>')

        try {
            const response = await axios.put(`/recurring-events/${configId}/sync`)

            if (response.data.success) {
                const result = response.data

                // Build compact status message
                const parts = []
                if (result.created > 0) parts.push(`✓ ${result.created}`)
                if (result.updated > 0) parts.push(`↻ ${result.updated}`)
                if (result.skipped > 0) parts.push(`⊘ ${result.skipped}`)
                if (result.errors && result.errors.length > 0) parts.push(`✗ ${result.errors.length}`)

                const message = parts.length > 0 ? parts.join(' • ') : 'Synced!'

                // Show success message in button
                $button.removeClass('disabled')
                $button.html(message)

                // Reset button after 3 seconds
                setTimeout(() => {
                    $button.html('Sync Events')
                }, 3000)

            } else {
                throw new Error(response.data.error || 'Unknown error')
            }

        } catch (error) {
            console.error('Sync error:', error)
            const errorMessage = error.response?.data?.error || error.message || 'Sync failed'

            // Show error state in button
            $button.removeClass('disabled')
            $button.html(`✗ ${errorMessage}`)

            // Reset button after 5 seconds
            setTimeout(() => {
                $button.html('Sync Events')
            }, 5000)
        }
    })
}
