# Aungmoe Personal Website

## Project Overview

This is a personal website built with Node.js and Express.js. It includes features like:
- Personal website/portfolio
- Map-It-Notion integration (syncing with Notion API)
- MongoDB for bookmarks
- Authentication with Passport.js
- Markdown rendering with syntax highlighting

## Tech Stack
- **Backend**: Node.js (v20+), Express.js
- **Database**: MongoDB (Mongoose)
- **Template Engine**: Handlebars (express-handlebars)
- **Authentication**: Passport.js with local strategy
- **Styling**: Sass
- **Markdown**: markdown-it with emoji support and syntax highlighting (highlight.js)

## Environment Setup
- Requires `.env` file with:
  - `MONGODB_BOOKMARK_CONNECTION_STRING`
  - `SESSION_SECRET`
  - `YELP_API`
  - `GOOGLE_API` (local development only, not the same as client-side Maps API)
- Node version: >=20.0.0
- NPM version: >=8.15.x

## Development Workflow
- **Start dev server**: `npm run nodemon`
- **Start production**: `npm start`
- **Watch Sass**: `npm run sass`
- **Deploy**: Using fly.io

## Code Style Preferences
- Use modern ES6+ JavaScript features
- Prefer async/await over callbacks
- Keep code modular and organized in `/src` directory

## Important Notes
- Never commit API keys or `.env` file
- Don't use the same Google API key for server-side and client-side (client-side is exposed)
- Generate temporary Google API keys for localhost development and delete after use
- The Notion API doesn't save seconds in datetime, so we use a 'synced' property to prevent duplicate reloads

## Project Structure
- `/src` - Source code
  - `/app-area` - Application features
    - `/map-it-notion` - Notion integration feature
- `app.js` - Main application entry point
- `/node_modules` - Dependencies (not in git)

aungmoe/
├── app.js - Main application entry point
├── fly.toml - generated to be deployed to fly.io
├── README.md
└── src/
    ├── app-area/
    │   ├── blog/ - feature for hosting blogs that I want to host
    │   │   ├── blog-controller.js - main entry point for getting into blog
    │   │   ├── css/
    │   │   ├── js/
    │   │   ├── media/ - pictures related to blogs
    │   │   ├── page/ - each page is represented with a markdown
    │   │   └── view/ - UI view to render the blog
    │   ├── bookmark/ - feature for book marking links to webtoons or novels
    │   │   ├── bookmark-controller.js - main entry point for bookmarks
    │   │   ├── css/
    │   │   ├── js/
    │   │   └── view/
    │   ├── index/ - main page of aungmoe.com
    │   │   ├── css/
    │   │   ├── index-controller.js
    │   │   ├── js/
    │   │   ├── media/
    │   │   └── view/
    │   ├── map-it-notion/ - given a list of coordinates from Notion, it would generate a Google Maps with pins. This would be rendered in the Notion to represent various locations
    │   │   ├── css/
    │   │   ├── js/
    │   │   ├── map-it-notion-controller.js
    │   │   └── view/
    │   ├── project/ - list of projects to post for showcasing my past works
    │   │   ├── css/
    │   │   ├── project-controller.js
    │   │   └── view/
    │   ├── randomize-order/ - a randomizer of people used in a boardgame so the order of play is different after each round
    │   │   ├── css/
    │   │   ├── js/
    │   │   ├── randomize-order-controller.js
    │   │   └── view/
    │   ├── read/
    │   │   ├── read-controller-utility.js - common utility for read-novel and read-webtoons 
    │   │   ├── read-novel/ - read from a text-based novel, pulling from an outside source
    │   │   │   ├── css/
    │   │   │   ├── js/
    │   │   │   ├── read-novel-controller.js
    │   │   │   └── view/
    │   │   └── read-webtoon/ - read from a image-based webtoons, pulling from an outside source
    │   │       ├── css/
    │   │       ├── js/
    │   │       ├── read-webtoon-controller.js
    │   │       └── view/
    │   └── utility.js - common utility file shared by controllers
    ├── database/
    │   ├── database.js - connect to MongoDB
    │   └── model/ - various database models
    │       ├── Bookmark.js
    │       ├── NotionMap.js
    │       ├── User.js
    │       └── Website.js
    ├── global/ - common components to be used throughout the project
    │   ├── BingSiteAuth.xml
    │   ├── css/ - uses scss to write re-usable code that gets rendered into css
    │   │   ├── components/
    │   │   ├── default.css
    │   │   ├── default.css.map
    │   │   ├── default.scss
    │   │   ├── highlight/
    │   │   ├── layouts/
    │   │   │   └── _main.scss
    │   │   ├── materialize.css
    │   │   ├── materialize.css.map
    │   │   ├── materialize.min.css
    │   │   └── materialize.scss
    │   ├── js/ - re-usable javascript components
    │   │   ├── _footer.js - footer for all pages
    │   │   ├── _header.js - header for all pages
    │   │   ├── materialize.js
    │   │   ├── materialize.min.js
    │   │   └── NoSleep.min.js
    │   ├── media/ - any media files that can be used throughout the app
    │   ├── robots.txt
    │   └── view/ - re-usable UI views
    │       ├── credit.handlebars
    │       ├── error.handlebars
    │       └── layout/
    │           ├── empty-template.handlebars
    │           └── template.handlebars
    └── services/ - services that helps provide functionality to various smaller components that can be used in various app areas. 
        └── googleapiservice.js