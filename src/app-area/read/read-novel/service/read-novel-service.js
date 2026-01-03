"use strict";

/* #region  Imports */
var rp = require('request-promise');
var unfluff = require('unfluff');
var cheerio = require('cheerio');
var readControllerUtility = require('../../read-controller-utility');
/* #endregion */

/* #region  Single Chapter Fetching */
/**
 * Fetches a single chapter from the given URL
 * @param {string} url - Chapter URL to fetch
 * @returns {Promise<{title: string, alternativeTitles: string, paragraphs: string[], nextPageLink: string, html: string}>}
 */
async function fetchSingleChapter(url) {
    const html = await rp({
        url: url,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.111 Safari/537.36'
        },
        json: true
    });

    const loadedCheerio = cheerio.load(html);
    const data = unfluff(html);
    const textTitles = readControllerUtility.findTextTitle(data.title, loadedCheerio);
    const paragraphs = data.text.split('\n\n');
    const nextPageLink = readControllerUtility.findNextPageLink(data.links, loadedCheerio, url);

    return {
        title: textTitles[0],
        alternativeTitles: readControllerUtility.getAlternativeTitleString(textTitles),
        paragraphs: paragraphs,
        nextPageLink: nextPageLink,
        html: html
    };
}
/* #endregion */

/* #region  Multiple Chapters Fetching */
/**
 * Fetches multiple chapters starting from the given URL
 * @param {string} startUrl - Starting chapter URL
 * @param {number} chaptersToLoad - Number of chapters to load (1-5)
 * @returns {Promise<Array<{title: string, alternativeTitles: string, paragraphs: string[], nextPageLink: string}>>}
 */
async function fetchMultipleChapters(startUrl, chaptersToLoad) {
    const chapters = [];
    let currentUrl = startUrl;

    for (let i = 0; i < chaptersToLoad && currentUrl; i++) {
        try {
            const chapter = await fetchSingleChapter(currentUrl);
            chapters.push(chapter);
            currentUrl = chapter.nextPageLink;
        } catch (error) {
            console.error(`Failed to fetch chapter ${i + 1} from ${currentUrl}:`, error);
            // If we have at least one chapter, return what we have
            if (chapters.length > 0) {
                break;
            }
            // If the first chapter fails, throw the error
            throw error;
        }
    }

    return chapters;
}
/* #endregion */

/* #region  Skip Ahead URL Calculation */
/**
 * Calculates the URL to skip N chapters ahead
 * @param {string} startUrl - Current chapter URL
 * @param {number} chaptersToSkip - Number of chapters to skip
 * @returns {Promise<string|null>} - URL of the chapter after skipping, or null if not found
 */
async function calculateSkipAheadUrl(startUrl, chaptersToSkip) {
    let currentUrl = startUrl;

    for (let i = 0; i < chaptersToSkip && currentUrl; i++) {
        try {
            currentUrl = await readControllerUtility.findNextPageLinkWithUrl(currentUrl);
        } catch (error) {
            console.error(`Failed to find next link while skipping chapter ${i + 1}:`, error);
            return null;
        }
    }

    return currentUrl;
}
/* #endregion */

module.exports = {
    fetchSingleChapter,
    fetchMultipleChapters,
    calculateSkipAheadUrl
};
