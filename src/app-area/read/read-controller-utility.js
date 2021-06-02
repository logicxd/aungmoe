/* #region  Imports */
var rp = require('request-promise');
var unfluff = require('unfluff');
var cheerio = require('cheerio');
var BookmarkModel = require('../../database/model/Bookmark')
/* #endregion */

/* #region  Bookmark */
async function updateBookmarkIfNeeded(req, bookmarkId, lastReadTitle, lastReadUrl, nextPageLink) {
    try {
        if (!req.isAuthenticated() || !bookmarkId) { return }

        let bookmark = await BookmarkModel.findById(bookmarkId)
        if (!bookmark) {
            return
        }

        // This works but I want to reduce API hits so will replace it with static chapter
        // const nextPageTitle = await findTextTitleWithUrl(nextPageLink)
        const nextPageTitle = 'Next Chapter'
        await updateBookmark(bookmark, lastReadTitle, lastReadUrl, nextPageTitle, nextPageLink)
    } catch (error) {
        console.error(error)
    }
}

async function updateBookmark(bookmark, lastReadTitle, lastReadUrl, nextPageTitle, nextPageLink) {
    bookmark.lastReadTitle = lastReadTitle
    bookmark.lastReadUrl = lastReadUrl
    bookmark.nextChapterTitle = nextPageTitle ?? 'Next Chapter'
    bookmark.nextChapterUrl = nextPageLink
    bookmark.modifiedDate = Date.now()
    bookmark.nextChapterCheckedOn = bookmark.modifiedDate
    await bookmark.save()
}

async function updateBookmarkWithNextChapterInfo(bookmark, nextPageTitle, nextPageLink) {
    bookmark.nextChapterTitle = nextPageTitle ?? 'Next Chapter'
    bookmark.nextChapterUrl = nextPageLink
    bookmark.modifiedDate = Date.now()
    bookmark.nextChapterCheckedOn = bookmark.modifiedDate
    await bookmark.save()
}
/* #endregion */

/* #region  Title */
async function findTextTitleWithUrl(url) {
    try {
        var html = await rp(url)
        var loadedCheerio = cheerio.load(html)
        var data = unfluff(html);
        var textTitles = findTextTitle(data.title, loadedCheerio);
        return textTitles.length > 0 ? textTitles[0] : null
    } catch (error) {
        console.log(error);
        return null
    }
}

/**
 * Tries to find title and alternative titles or chapters
 * @param {string} unfluffTitle title parsed using unfluff
 * @param {Object} loadedCheerio html-loaded cheerio
 * @returns {string[]} an array of ['Text Title', 'Alt. title 1', 'Alt. Title 2', ...] 
 */
function findTextTitle(unfluffTitle, loadedCheerio) {
    var titleCandidates = [unfluffTitle];
    var selectors = ['h1', 'h2', 'h3', 'p:contains("Chapter")'];
    var textTitles = [unfluffTitle];
    var subTitleSet = new Set([unfluffTitle]);
    try {
        // Grab possible content titles from `selectors` elements
        for (var i = 0; i < selectors.length; ++i) {
            loadedCheerio(selectors[i]).contents().each(function (i, node) {
                if (node.data != null) {
                    var title = node.data.trim();
                    if (title.length > 0) {
                        titleCandidates.push(title);

                        // 'h1' selectors are added as alternative title
                        if (selectors[i] === 'h1') {
                            subTitleSet.add(title);
                        }
                    }
                }
            });
        }
        // Determine text title
        for (let title of titleCandidates) {
            var useTitle = /\d/.test(title)
            if (useTitle) {
                textTitles[0] = title
                break
            }
        }
        subTitleSet.delete(textTitles[0]);
        subTitleSet.forEach(subTitle => {
            textTitles.push(subTitle);
        });
    } catch (error) {
        console.error(error);
        textTitles = [unfluffTitle];
    }
    return textTitles;
}

/**
 * Gets alternative titles text
 * @param {string[]} textTitles array of titles found
 * @returns {string} comma separated string to represent alternative titles
 */
function getAlternativeTitleString(textTitles) {
    var titles = textTitles.slice(1);
    var titleString = '';
    for (var i = 0; i < titles.length && i < 5; ++i) {
        titleString += `${i > 0 ? ',' : ''} ${titles[i]}`;
    }
    return titleString;
}
/* #endregion */

/* #region  Next Page URL*/
async function findNextPageLinkWithUrl(url) {
    try {
        var html = await rp(url)
        var loadedCheerio = cheerio.load(html)
        var data = unfluff(html);
        var nextPageLink = findNextPageLink(data.links, loadedCheerio, url)
        return nextPageLink
    } catch (error) {
        console.log(error);
        return null
    }
}

/**
 * Attempts to find the "Next" page link for the given website
 * @param {string[]} unfluffLinks array of links found using unfluff
 * @param {Object} loadedCheerio html-loaded cheerio
 * @param {string} sourceUrl base URL of the website visiting
 */
function findNextPageLink(unfluffLinks, loadedCheerio, sourceUrl) {
    var nextPageLink = findNextPageLinkUsingUnfluff(unfluffLinks)
    nextPageLink = nextPageLink === '' ? findNextPageLinkUsingCheerio(loadedCheerio) : nextPageLink
    nextPageLink = turnURLIntoAbsolutePathIfNeeded(nextPageLink, sourceUrl)
    return nextPageLink
}

function findNextPageLinkUsingUnfluff(links) {
    var link = '';
    for (var i = links.length - 1; i >= 0; --i) {
        var linkObject = links[i];
        var linkText = linkObject.text.toLowerCase();
        if (linkText.includes('next')) {
            link = linkObject.href;
            break;
        }
    }
    return link;
}

function findNextPageLinkUsingCheerio(loadedCheerio) {
    var linkContents = loadedCheerio('a').contents();
    var link = '';
    try {
        for (var i = linkContents.length - 1; i >= 0; --i) {
            var node = linkContents.get(i)
            var foundNextLink = findNextPageLinkUsingCheerio_CheckForContentNodeData(node)
            foundNextLink = foundNextLink || findNextPageLinkUsingCheerio_CheckForChildrenNodeData(node)
            foundNextLink = foundNextLink || findNextPageLinkUsingCheerio_CheckParentNodeAttributes(node)

            if (foundNextLink) {
                link = node.parent.attribs.href;
                break;
            }
        }
    } catch (error) {
        console.error(error);
    }
    return link;
}

function findNextPageLinkUsingCheerio_CheckForContentNodeData(node) {
    var nodeText = node.data;
    nodeText = nodeText == null ? '' : nodeText.toLowerCase();
    return nodeText.includes('next')
}

function findNextPageLinkUsingCheerio_CheckForChildrenNodeData(node) {
    if (!node.children) { return false; }

    for (var i = 0; i < node.children.length; ++i) {
        var childNode = node.children[i];

        if (!childNode.data) {
            continue;
        }
        if (childNode.data.toLowerCase().includes('next')) {
            return true;
        }
    }
    return false;
}

function findNextPageLinkUsingCheerio_CheckParentNodeAttributes(node) {
    var parent = node.parent
    var attribs = parent.attribs
    if (attribs) {
        if (attribs.rel && attribs.rel.toLowerCase().includes('next')) {
            return true
        }
    }
    return false
}
/* #endregion */

/* #region  URL Utility */
/**
 * Makes sure the given link is turned into an absolute URL string
 * @param {string} link an absolute or a relative URL
 * @param {string} baseUrl base domain to append relative URL to
 * @returns {string} absolute URL string
 */
function turnURLIntoAbsolutePathIfNeeded(link, baseUrl) {
    if (link === '' || isAbsoluteLink(link)) {
        return link;
    }

    var url = new URL(baseUrl);
    url.pathname = link;
    return url.toString();
}

function isAbsoluteLink(link) {
    var r = new RegExp('^(?:[a-z]+:)?//', 'i');
    return r.test(link);
}
/* #endregion */

module.exports = {
    updateBookmarkIfNeeded,
    updateBookmarkWithNextChapterInfo,
    findTextTitleWithUrl,
    findTextTitle,
    findNextPageLinkWithUrl,
    findNextPageLink,
    getAlternativeTitleString,
}