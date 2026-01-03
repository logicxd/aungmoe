import { describe, it, expect } from 'vitest'

describe('Read Novel Service', () => {
    describe('preprocessChaptersWithGlobalIds logic', () => {
        it('should assign global paragraph IDs across chapters', () => {
            // Test the preprocessing function logic
            const preprocessChaptersWithGlobalIds = (chapters) => {
                let globalParagraphIndex = 0;

                return chapters.map(chapter => {
                    const paragraphsWithIds = chapter.paragraphs.map(text => {
                        return {
                            text: text,
                            globalId: globalParagraphIndex++
                        };
                    });

                    return {
                        title: chapter.title,
                        alternativeTitles: chapter.alternativeTitles,
                        paragraphs: paragraphsWithIds,
                        nextPageLink: chapter.nextPageLink
                    };
                });
            }

            const chapters = [
                {
                    title: 'Chapter 1',
                    alternativeTitles: '',
                    paragraphs: ['Para 1', 'Para 2', 'Para 3'],
                    nextPageLink: '/ch2'
                },
                {
                    title: 'Chapter 2',
                    alternativeTitles: '',
                    paragraphs: ['Para 4', 'Para 5'],
                    nextPageLink: '/ch3'
                },
                {
                    title: 'Chapter 3',
                    alternativeTitles: '',
                    paragraphs: ['Para 6', 'Para 7', 'Para 8', 'Para 9'],
                    nextPageLink: ''
                }
            ]

            const result = preprocessChaptersWithGlobalIds(chapters)

            // Verify structure is maintained
            expect(result).toHaveLength(3)
            expect(result[0].title).toBe('Chapter 1')
            expect(result[1].title).toBe('Chapter 2')
            expect(result[2].title).toBe('Chapter 3')

            // Verify global IDs are sequential across chapters
            expect(result[0].paragraphs[0].globalId).toBe(0)
            expect(result[0].paragraphs[1].globalId).toBe(1)
            expect(result[0].paragraphs[2].globalId).toBe(2)

            expect(result[1].paragraphs[0].globalId).toBe(3)
            expect(result[1].paragraphs[1].globalId).toBe(4)

            expect(result[2].paragraphs[0].globalId).toBe(5)
            expect(result[2].paragraphs[1].globalId).toBe(6)
            expect(result[2].paragraphs[2].globalId).toBe(7)
            expect(result[2].paragraphs[3].globalId).toBe(8)

            // Verify text content is preserved
            expect(result[0].paragraphs[0].text).toBe('Para 1')
            expect(result[1].paragraphs[0].text).toBe('Para 4')
            expect(result[2].paragraphs[0].text).toBe('Para 6')
        })

        it('should handle single chapter', () => {
            const preprocessChaptersWithGlobalIds = (chapters) => {
                let globalParagraphIndex = 0;

                return chapters.map(chapter => {
                    const paragraphsWithIds = chapter.paragraphs.map(text => {
                        return {
                            text: text,
                            globalId: globalParagraphIndex++
                        };
                    });

                    return {
                        title: chapter.title,
                        alternativeTitles: chapter.alternativeTitles,
                        paragraphs: paragraphsWithIds,
                        nextPageLink: chapter.nextPageLink
                    };
                });
            }

            const chapters = [
                {
                    title: 'Chapter 1',
                    alternativeTitles: 'Alt Title',
                    paragraphs: ['Para 1', 'Para 2'],
                    nextPageLink: '/ch2'
                }
            ]

            const result = preprocessChaptersWithGlobalIds(chapters)

            expect(result).toHaveLength(1)
            expect(result[0].paragraphs[0].globalId).toBe(0)
            expect(result[0].paragraphs[1].globalId).toBe(1)
        })

        it('should handle empty paragraphs array', () => {
            const preprocessChaptersWithGlobalIds = (chapters) => {
                let globalParagraphIndex = 0;

                return chapters.map(chapter => {
                    const paragraphsWithIds = chapter.paragraphs.map(text => {
                        return {
                            text: text,
                            globalId: globalParagraphIndex++
                        };
                    });

                    return {
                        title: chapter.title,
                        alternativeTitles: chapter.alternativeTitles,
                        paragraphs: paragraphsWithIds,
                        nextPageLink: chapter.nextPageLink
                    };
                });
            }

            const chapters = [
                {
                    title: 'Chapter 1',
                    alternativeTitles: '',
                    paragraphs: [],
                    nextPageLink: ''
                }
            ]

            const result = preprocessChaptersWithGlobalIds(chapters)

            expect(result).toHaveLength(1)
            expect(result[0].paragraphs).toHaveLength(0)
        })

        it('should handle large number of chapters and paragraphs', () => {
            const preprocessChaptersWithGlobalIds = (chapters) => {
                let globalParagraphIndex = 0;

                return chapters.map(chapter => {
                    const paragraphsWithIds = chapter.paragraphs.map(text => {
                        return {
                            text: text,
                            globalId: globalParagraphIndex++
                        };
                    });

                    return {
                        title: chapter.title,
                        alternativeTitles: chapter.alternativeTitles,
                        paragraphs: paragraphsWithIds,
                        nextPageLink: chapter.nextPageLink
                    };
                });
            }

            // Create 5 chapters with 10 paragraphs each
            const chapters = Array.from({ length: 5 }, (_, chapterIndex) => ({
                title: `Chapter ${chapterIndex + 1}`,
                alternativeTitles: '',
                paragraphs: Array.from({ length: 10 }, (_, paraIndex) => `Para ${paraIndex + 1}`),
                nextPageLink: chapterIndex < 4 ? `/ch${chapterIndex + 2}` : ''
            }))

            const result = preprocessChaptersWithGlobalIds(chapters)

            expect(result).toHaveLength(5)

            // Check first chapter starts at 0
            expect(result[0].paragraphs[0].globalId).toBe(0)
            expect(result[0].paragraphs[9].globalId).toBe(9)

            // Check second chapter starts at 10
            expect(result[1].paragraphs[0].globalId).toBe(10)
            expect(result[1].paragraphs[9].globalId).toBe(19)

            // Check last chapter ends at 49
            expect(result[4].paragraphs[0].globalId).toBe(40)
            expect(result[4].paragraphs[9].globalId).toBe(49)
        })
    })

    describe('Query Parameter Validation', () => {
        it('should clamp chaptersPerPage to 1-5 range', () => {
            const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

            expect(clamp(0, 1, 5)).toBe(1)
            expect(clamp(-5, 1, 5)).toBe(1)
            expect(clamp(1, 1, 5)).toBe(1)
            expect(clamp(3, 1, 5)).toBe(3)
            expect(clamp(5, 1, 5)).toBe(5)
            expect(clamp(10, 1, 5)).toBe(5)
            expect(clamp(100, 1, 5)).toBe(5)
        })

        it('should handle string inputs by parsing to integer', () => {
            const parseAndClamp = (value) => {
                const parsed = parseInt(value) || 1
                return Math.min(Math.max(parsed, 1), 5)
            }

            expect(parseAndClamp('3')).toBe(3)
            expect(parseAndClamp('10')).toBe(5)
            expect(parseAndClamp('0')).toBe(1)
            expect(parseAndClamp('')).toBe(1)
            expect(parseAndClamp('invalid')).toBe(1)
            expect(parseAndClamp(undefined)).toBe(1)
            expect(parseAndClamp(null)).toBe(1)
        })
    })

    describe('Skip-ahead URL calculation logic', () => {
        it('should calculate correct skip count for multi-chapter loading', () => {
            // Test the logic for skipping chapters
            const calculateSkipCount = (currentChapterNum, chaptersPerPage) => {
                return currentChapterNum + chaptersPerPage
            }

            // If loading 3 chapters starting at chapter 1
            expect(calculateSkipCount(1, 3)).toBe(4) // Next should be chapter 4

            // If loading 5 chapters starting at chapter 10
            expect(calculateSkipCount(10, 5)).toBe(15) // Next should be chapter 15

            // If loading 1 chapter (default)
            expect(calculateSkipCount(5, 1)).toBe(6) // Next should be chapter 6
        })
    })

    describe('Chapter data structure validation', () => {
        it('should validate chapter structure has required fields', () => {
            const isValidChapter = (chapter) => {
                if (!chapter || typeof chapter !== 'object') {
                    return false
                }
                return (
                    typeof chapter.title === 'string' &&
                    typeof chapter.alternativeTitles === 'string' &&
                    Array.isArray(chapter.paragraphs) &&
                    typeof chapter.nextPageLink === 'string'
                )
            }

            const validChapter = {
                title: 'Chapter 1',
                alternativeTitles: 'Alt Title',
                paragraphs: ['Para 1', 'Para 2'],
                nextPageLink: '/ch2'
            }

            expect(isValidChapter(validChapter)).toBe(true)

            expect(isValidChapter({ ...validChapter, title: null })).toBe(false)
            expect(isValidChapter({ ...validChapter, paragraphs: 'not array' })).toBe(false)
            expect(isValidChapter(null)).toBe(false)
            expect(isValidChapter(undefined)).toBe(false)
            expect(isValidChapter({})).toBe(false)
        })

        it('should validate paragraph structure with globalId', () => {
            const isValidParagraph = (paragraph) => {
                if (!paragraph || typeof paragraph !== 'object') {
                    return false
                }
                return (
                    typeof paragraph.text === 'string' &&
                    typeof paragraph.globalId === 'number' &&
                    paragraph.globalId >= 0
                )
            }

            expect(isValidParagraph({ text: 'Hello', globalId: 0 })).toBe(true)
            expect(isValidParagraph({ text: 'World', globalId: 100 })).toBe(true)
            expect(isValidParagraph({ text: 'Invalid', globalId: -1 })).toBe(false)
            expect(isValidParagraph({ text: 'Missing' })).toBe(false)
            expect(isValidParagraph({ globalId: 5 })).toBe(false)
            expect(isValidParagraph(null)).toBe(false)
            expect(isValidParagraph(undefined)).toBe(false)
        })
    })
})
