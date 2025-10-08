"use strict";

const axios = require('axios');
const axiosRetry = require('axios-retry').default;

/**
 * Notion API Service
 *
 * A centralized service for making API calls to Notion.
 * Supports multiple API versions for backward compatibility.
 * Handles rate limiting with exponential backoff using axios-retry.
 */

const DEFAULT_NOTION_VERSION = '2025-09-03';
const LEGACY_NOTION_VERSION = '2022-02-22';

// Configure axios-retry for rate limiting
axiosRetry(axios, {
    retries: 3,
    retryDelay: (retryCount, error) => {
        // Use retry-after header if available (Notion provides this in seconds)
        if (error.response?.headers['retry-after']) {
            return parseInt(error.response.headers['retry-after']) * 1000;
        }
        // Otherwise use exponential backoff
        return axiosRetry.exponentialDelay(retryCount);
    },
    retryCondition: (error) => {
        // Retry on rate limit (429) or network errors
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
    }
});

/**
 * Get a database
 * @param {string} apiKey - Notion API key
 * @param {string} databaseId - Database ID
 * @param {string} notionVersion - Notion API version (optional, defaults to latest)
 * @returns {Promise<Object>} Database object
 */
async function getDatabase(apiKey, databaseId, notionVersion = DEFAULT_NOTION_VERSION) {
    const options = {
        method: 'GET',
        url: `https://api.notion.com/v1/databases/${databaseId}`,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Notion-Version': notionVersion
        }
    };

    const res = await axios(options);
    return res.data;
}

/**
 * Query a database (legacy endpoint)
 * @param {string} apiKey - Notion API key
 * @param {string} databaseId - Database ID
 * @param {Object} queryOptions - Query options (page_size, sorts, filter, etc.)
 * @param {string} notionVersion - Notion API version (optional, defaults to legacy)
 * @returns {Promise<Object>} Query results with all pages
 */
async function queryDatabase(apiKey, databaseId, queryOptions = {}, notionVersion = LEGACY_NOTION_VERSION) {
    let allResults = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
        const options = {
            method: 'POST',
            url: `https://api.notion.com/v1/databases/${databaseId}/query`,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'Notion-Version': notionVersion,
                'Content-Type': 'application/json'
            },
            data: {
                page_size: 100,
                ...queryOptions,
                ...(startCursor && { start_cursor: startCursor })
            }
        };

        const res = await axios(options);
        allResults = allResults.concat(res.data.results);
        hasMore = res.data.has_more;
        startCursor = res.data.next_cursor;
    }

    return {
        results: allResults,
        has_more: false,
        next_cursor: null
    };
}

/**
 * Get a data source
 * @param {string} apiKey - Notion API key
 * @param {string} dataSourceId - Data source ID
 * @param {string} notionVersion - Notion API version (optional, defaults to latest)
 * @returns {Promise<Object>} Data source object
 */
async function getDataSource(apiKey, dataSourceId, notionVersion = DEFAULT_NOTION_VERSION) {
    const options = {
        method: 'GET',
        url: `https://api.notion.com/v1/data_sources/${dataSourceId}`,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Notion-Version': notionVersion
        }
    };

    const res = await axios(options);
    return res.data;
}

/**
 * Update a data source
 * @param {string} apiKey - Notion API key
 * @param {string} dataSourceId - Data source ID
 * @param {Object} properties - Properties to update
 * @param {string} notionVersion - Notion API version (optional, defaults to latest)
 * @returns {Promise<Object>} Updated data source object
 */
async function updateDataSource(apiKey, dataSourceId, properties, notionVersion = DEFAULT_NOTION_VERSION) {
    const options = {
        method: 'PATCH',
        url: `https://api.notion.com/v1/data_sources/${dataSourceId}`,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Notion-Version': notionVersion,
            'Content-Type': 'application/json'
        },
        data: {
            properties: properties
        }
    };

    const res = await axios(options);
    return res.data;
}

/**
 * Query a data source (fetch pages)
 * @param {string} apiKey - Notion API key
 * @param {string} dataSourceId - Data source ID
 * @param {Object} filter - Filter object (optional)
 * @param {Array} sorts - Sort options (optional)
 * @param {number} pageSize - Page size (optional, defaults to 100)
 * @param {string} notionVersion - Notion API version (optional, defaults to latest)
 * @returns {Promise<Object>} Query results with all pages
 */
async function queryDataSource(apiKey, dataSourceId, filter = null, sorts = null, pageSize = 100, notionVersion = DEFAULT_NOTION_VERSION) {
    let allResults = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
        const options = {
            method: 'POST',
            url: `https://api.notion.com/v1/data_sources/${dataSourceId}/query`,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'Notion-Version': notionVersion,
                'Content-Type': 'application/json'
            },
            data: {
                page_size: pageSize,
                ...(filter && { filter }),
                ...(sorts && { sorts }),
                ...(startCursor && { start_cursor: startCursor })
            }
        };

        const res = await axios(options);
        allResults = allResults.concat(res.data.results);
        hasMore = res.data.has_more;
        startCursor = res.data.next_cursor;
    }

    return {
        results: allResults,
        has_more: false,
        next_cursor: null
    };
}

/**
 * Get a page
 * @param {string} apiKey - Notion API key
 * @param {string} pageId - Page ID
 * @param {string} notionVersion - Notion API version (optional, defaults to latest)
 * @returns {Promise<Object>} Page object
 */
async function getPage(apiKey, pageId, notionVersion = DEFAULT_NOTION_VERSION) {
    const options = {
        method: 'GET',
        url: `https://api.notion.com/v1/pages/${pageId}`,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Notion-Version': notionVersion
        }
    };

    const res = await axios(options);
    return res.data;
}

/**
 * Create a page
 * @param {string} apiKey - Notion API key
 * @param {string} dataSourceId - Parent data source ID
 * @param {Object} properties - Page properties
 * @param {Object} icon - Page icon (optional)
 * @param {Array} children - Page content blocks (optional)
 * @param {string} notionVersion - Notion API version (optional, defaults to latest)
 * @returns {Promise<Object>} Created page object
 */
async function createPage(apiKey, dataSourceId, properties, icon = null, children = null, notionVersion = DEFAULT_NOTION_VERSION) {
    const options = {
        method: 'POST',
        url: `https://api.notion.com/v1/pages`,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Notion-Version': notionVersion,
            'Content-Type': 'application/json'
        },
        data: {
            parent: {
                type: 'data_source_id',
                data_source_id: dataSourceId
            },
            properties: properties,
            ...(icon && { icon: icon }),
            ...(children && { children: children })
        }
    };

    const res = await axios(options);
    return res.data;
}

/**
 * Update a page
 * @param {string} apiKey - Notion API key
 * @param {string} pageId - Page ID
 * @param {Object} properties - Properties to update
 * @param {Object} icon - Page icon (optional)
 * @param {string} notionVersion - Notion API version (optional, defaults to latest)
 * @returns {Promise<Object>} Updated page object
 */
async function updatePage(apiKey, pageId, properties, icon = null, notionVersion = DEFAULT_NOTION_VERSION) {
    const options = {
        method: 'PATCH',
        url: `https://api.notion.com/v1/pages/${pageId}`,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Notion-Version': notionVersion,
            'Content-Type': 'application/json'
        },
        data: {
            properties: properties,
            ...(icon && { icon: icon })
        }
    };

    const res = await axios(options);
    return res.data;
}

/**
 * Get page blocks (children)
 * @param {string} apiKey - Notion API key
 * @param {string} pageId - Page ID
 * @param {string} notionVersion - Notion API version (optional, defaults to latest)
 * @returns {Promise<Object>} Blocks object with all pages
 */
async function getPageBlocks(apiKey, pageId, notionVersion = DEFAULT_NOTION_VERSION) {
    let allResults = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
        const url = new URL(`https://api.notion.com/v1/blocks/${pageId}/children`);
        if (startCursor) {
            url.searchParams.append('start_cursor', startCursor);
        }

        const options = {
            method: 'GET',
            url: url.toString(),
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'Notion-Version': notionVersion
            }
        };

        const res = await axios(options);
        allResults = allResults.concat(res.data.results);
        hasMore = res.data.has_more;
        startCursor = res.data.next_cursor;
    }

    return {
        results: allResults,
        has_more: false,
        next_cursor: null
    };
}

/**
 * Append blocks to a page
 * @param {string} apiKey - Notion API key
 * @param {string} pageId - Page ID
 * @param {Array} children - Blocks to append
 * @param {string} notionVersion - Notion API version (optional, defaults to latest)
 * @returns {Promise<Object>} Updated blocks object
 */
async function appendBlocks(apiKey, pageId, children, notionVersion = DEFAULT_NOTION_VERSION) {
    const options = {
        method: 'PATCH',
        url: `https://api.notion.com/v1/blocks/${pageId}/children`,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Notion-Version': notionVersion,
            'Content-Type': 'application/json'
        },
        data: {
            children: children
        }
    };

    const res = await axios(options);
    return res.data;
}

/**
 * Delete a block
 * @param {string} apiKey - Notion API key
 * @param {string} blockId - Block ID
 * @param {string} notionVersion - Notion API version (optional, defaults to latest)
 * @returns {Promise<Object>} Deleted block object
 */
async function deleteBlock(apiKey, blockId, notionVersion = DEFAULT_NOTION_VERSION) {
    const options = {
        method: 'DELETE',
        url: `https://api.notion.com/v1/blocks/${blockId}`,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Notion-Version': notionVersion
        }
    };

    const res = await axios(options);
    return res.data;
}

/**
 * Replace all blocks in a page
 * @param {string} apiKey - Notion API key
 * @param {string} pageId - Page ID
 * @param {Array} children - New blocks to replace with
 * @param {string} notionVersion - Notion API version (optional, defaults to latest)
 * @returns {Promise<void>}
 */
async function replacePageBlocks(apiKey, pageId, children, notionVersion = DEFAULT_NOTION_VERSION) {
    // First, get existing blocks
    const existingBlocks = await getPageBlocks(apiKey, pageId, notionVersion);

    // Delete all existing blocks
    for (const block of existingBlocks.results) {
        await deleteBlock(apiKey, block.id, notionVersion);
    }

    // Add new blocks
    if (children && children.length > 0) {
        await appendBlocks(apiKey, pageId, children, notionVersion);
    }
}

module.exports = {
    DEFAULT_NOTION_VERSION,
    LEGACY_NOTION_VERSION,
    getDatabase,
    queryDatabase,
    getDataSource,
    updateDataSource,
    queryDataSource,
    getPage,
    createPage,
    updatePage,
    getPageBlocks,
    appendBlocks,
    deleteBlock,
    replacePageBlocks
};
