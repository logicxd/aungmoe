$(() => ready())

async function ready() {
    setupEmbedSyncButton()
}

function setupEmbedSyncButton() {
    const $button = $('#embed-sync-button')
    const $status = $('#embed-status')
    const $statusText = $('#embed-status-text')
    const $btnText = $('.btn-text')
    const $btnLoader = $('.btn-loader')

    $button.click(async () => {
        const configId = $('#recurring-events-id').val()

        // Reset status
        $status.removeClass('success error').hide()
        $statusText.text('')

        // Show loading state
        $btnText.hide()
        $btnLoader.show()
        $button.addClass('loading').prop('disabled', true)

        try {
            const response = await axios.put(`/recurring-events/${configId}/sync`)

            if (response.data.success) {
                const result = response.data

                // Build compact status message
                const parts = []
                if (result.created > 0) parts.push(`✓ ${result.created} created`)
                if (result.updated > 0) parts.push(`↻ ${result.updated} updated`)
                if (result.skipped > 0) parts.push(`⊘ ${result.skipped} skipped`)
                if (result.errors && result.errors.length > 0) parts.push(`✗ ${result.errors.length} errors`)

                const message = parts.length > 0 ? parts.join(' • ') : 'Sync completed successfully'

                $statusText.text(message)
                $status.addClass('success').show()

            } else {
                throw new Error(response.data.error || 'Unknown error')
            }

        } catch (error) {
            console.error('Sync error:', error)
            const errorMessage = error.response?.data?.error || error.message || 'Sync failed'

            $statusText.text(`✗ ${errorMessage}`)
            $status.addClass('error').show()

        } finally {
            // Reset button state
            $btnLoader.hide()
            $btnText.show()
            $button.removeClass('loading').prop('disabled', false)
        }
    })
}
