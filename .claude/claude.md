# Project Overview

This is a personal website built with Node.js and Express.js. It includes features like:

- Personal website/portfolio
- Map-It-Notion integration (syncing with Notion API)
- MongoDB for bookmarks
- Authentication with Passport.js
- Markdown rendering with syntax highlighting

## Tech Stack

### Web

- Backend - Node.js (v20+), Express.js
- Database -MongoDB (Mongoose)
- Template Engine - Handlebars (express-handlebars)
- Authentication - Passport.js with local strategy
- Styling - Sass
- Markdown - markdown-it with emoji support and syntax highlighting (highlight.js)

## Development Workflow

- Start dev server: `npm run nodemon`
- Start production: `npm start`
- Watch Sass: `npm run sass`
- Deploy: Using [fly.io](http://fly.io/)

## Design Principles

1. Small, focused functions that do one thing well 
2. Keep files and classes small; organize top-down: high-level idea to details
3. Reduce coupling, increase cohesion
    - Keep related code close together and unrelated code apart
4. Fail fast with clear errors
    - Prefer exceptions to error codes
    - Provide informative messages and preserve context
    - Don’t return or accept null unless it’s an intentional, handled case
5. Use comments sparingly
    - Prefer self-explanatory code and names over comments (ex: extract them out into codes)
    - Comments are OK to explain the why if the code is complex
    - Make them brief
6. Data vs. objects
    - Keep data structures simple and transparent when behavior isn’t needed
    - Encapsulate behavior with data when invariants matter
7. Defensive boundaries and APIs
    - Design clear module boundaries with narrow, stable interfaces
    - Validate inputs at boundaries; avoid leaking internal representations
    - Hide implementation details; expose minimal surface area
8. Error handling is part of the logic
    - Keep try/catch blocks small; extract to dedicated functions when possible

## Code Style Preference

### Web

- Prefer async/await over callbacks
- Use #region blocks to group sections together if it’s long or contains multiple methods doing to help achieve a common task

## Security

- Never commit API keys or `.env` file
- Sanitize inputs that will go into databases
- Handle rate limiting when appropriate

## Project Structure

### Web

- Keep features separated in a sub-folder called “app-area”
- Each feature should have sub-folders to type like: css, js, media, page, view
- More re-usable code underneath src, alongside app-area like database, global, or services

Example:

- src
    - app-area
        - featureA
            - css
            - js
            - view
            feature-controller.js
        - featureB
    - database
        - model
            - MyDbModel.js
        - database.js
    - global
        - css
        - js
        - media
        - view
    - services
        - api-service.js

Current structure:
- aungmoe/
    - app.js - Main application entry point
    - fly.toml - Generated to be deployed to fly.io
    - README.md
    - src/ - Source code
        - app-area/ - Application features
            - blog/ - Feature for hosting blogs that I want to host
                - blog-controller.js - Main entry point for getting into blog
                - css/
                - js/
                - media/ - Pictures related to blogs
                - page/ - Each page is represented with a markdown
                - view/ - UI view to render the blog
            - bookmark/ - Feature for book marking links to webtoons or novels
                - bookmark-controller.js - Main entry point for bookmarks
                - css/
                - js/
                - view/
            - index/ - Main page of aungmoe.com
                - css/
                - index-controller.js
                - js/
                - media/
                - view/
            - map-it-notion/ - Given a list of coordinates from Notion, it would generate a Google Maps with pins. This would be rendered in the Notion to represent various locations
                - css/
                - js/
                - map-it-notion-controller.js
                - view/
            - project/ - List of projects to post for showcasing my past works
                - css/
                - project-controller.js
                - view/
            - randomize-order/ - A randomizer of people used in a boardgame so the order of play is different after each round
                - css/
                - js/
                - randomize-order-controller.js
                - view/
            - read/
                - read-controller-utility.js - Common utility for read-novel and read-webtoons
                - read-novel/ - Read from a text-based novel, pulling from an outside source
                    - css/
                    - js/
                    - read-novel-controller.js
                    - view/
                - read-webtoon/ - Read from a image-based webtoons, pulling from an outside source
                    - css/
                    - js/
                    - read-webtoon-controller.js
                    - view/
            - recurring-events/ - Processing recurring events from Notion
                - recurring-events-controller.js
                - service/
                    - recurring-events-service.js
            - utility.js - Common utility file shared by controllers
        - database/
            - database.js - Connect to MongoDB
            - model/ - Various database models
                - Bookmark.js
                - NotionMap.js
                - User.js
                - Website.js
        - global/ - Common components to be used throughout the project
            - BingSiteAuth.xml
            - css/ - Uses scss to write re-usable code that gets rendered into css
                - components/
                - default.css
                - default.css.map
                - default.scss
                - highlight/
                - layouts/
                    - _main.scss
                - materialize.css
                - materialize.css.map
                - materialize.min.css
                - materialize.scss
            - js/ - Re-usable javascript components
                - _footer.js - Footer for all pages
                - _header.js - Header for all pages
                - materialize.js
                - materialize.min.js
                - NoSleep.min.js
            - media/ - Any media files that can be used throughout the app
            - robots.txt
            - view/ - Re-usable UI views
                - credit.handlebars
                - error.handlebars
                - layout/
                    - empty-template.handlebars
                    - template.handlebars
        - services/ - Services that helps provide functionality to various smaller components that can be used in various app areas
            - googleapiservice.js
            - notionapiservice.js