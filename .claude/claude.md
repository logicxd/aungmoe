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

## Project Structure

Preference:
- Keep features separated in a sub-folder of app-area
- Feature should separate by css, js, media, page, view
- More re-usable code should be outside of that, in appropriate folders within src like database, global, or services

Current structure:
**aungmoe/**
- [app.js](app.js) - Main application entry point
- [fly.toml](fly.toml) - Generated to be deployed to fly.io
- [README.md](README.md)
- **src/** - Source code
  - **app-area/** - Application features
    - **blog/** - Feature for hosting blogs that I want to host
      - [blog-controller.js](src/app-area/blog/blog-controller.js) - Main entry point for getting into blog
      - **css/**
      - **js/**
      - **media/** - Pictures related to blogs
      - **page/** - Each page is represented with a markdown
      - **view/** - UI view to render the blog
    - **bookmark/** - Feature for book marking links to webtoons or novels
      - [bookmark-controller.js](src/app-area/bookmark/bookmark-controller.js) - Main entry point for bookmarks
      - **css/**
      - **js/**
      - **view/**
    - **index/** - Main page of aungmoe.com
      - **css/**
      - [index-controller.js](src/app-area/index/index-controller.js)
      - **js/**
      - **media/**
      - **view/**
    - **map-it-notion/** - Given a list of coordinates from Notion, it would generate a Google Maps with pins. This would be rendered in the Notion to represent various locations
      - **css/**
      - **js/**
      - [map-it-notion-controller.js](src/app-area/map-it-notion/map-it-notion-controller.js)
      - **view/**
    - **project/** - List of projects to post for showcasing my past works
      - **css/**
      - [project-controller.js](src/app-area/project/project-controller.js)
      - **view/**
    - **randomize-order/** - A randomizer of people used in a boardgame so the order of play is different after each round
      - **css/**
      - **js/**
      - [randomize-order-controller.js](src/app-area/randomize-order/randomize-order-controller.js)
      - **view/**
    - **read/**
      - [read-controller-utility.js](src/app-area/read/read-controller-utility.js) - Common utility for read-novel and read-webtoons
      - **read-novel/** - Read from a text-based novel, pulling from an outside source
        - **css/**
        - **js/**
        - [read-novel-controller.js](src/app-area/read/read-novel/read-novel-controller.js)
        - **view/**
      - **read-webtoon/** - Read from a image-based webtoons, pulling from an outside source
        - **css/**
        - **js/**
        - [read-webtoon-controller.js](src/app-area/read/read-webtoon/read-webtoon-controller.js)
        - **view/**
    - [utility.js](src/app-area/utility.js) - Common utility file shared by controllers
  - **database/**
    - [database.js](src/database/database.js) - Connect to MongoDB
    - **model/** - Various database models
      - [Bookmark.js](src/database/model/Bookmark.js)
      - [NotionMap.js](src/database/model/NotionMap.js)
      - [User.js](src/database/model/User.js)
      - [Website.js](src/database/model/Website.js)
  - **global/** - Common components to be used throughout the project
    - [BingSiteAuth.xml](src/global/BingSiteAuth.xml)
    - **css/** - Uses scss to write re-usable code that gets rendered into css
      - **components/**
      - [default.css](src/global/css/default.css)
      - [default.css.map](src/global/css/default.css.map)
      - [default.scss](src/global/css/default.scss)
      - **highlight/**
      - **layouts/**
        - [_main.scss](src/global/css/layouts/_main.scss)
      - [materialize.css](src/global/css/materialize.css)
      - [materialize.css.map](src/global/css/materialize.css.map)
      - [materialize.min.css](src/global/css/materialize.min.css)
      - [materialize.scss](src/global/css/materialize.scss)
    - **js/** - Re-usable javascript components
      - [_footer.js](src/global/js/_footer.js) - Footer for all pages
      - [_header.js](src/global/js/_header.js) - Header for all pages
      - [materialize.js](src/global/js/materialize.js)
      - [materialize.min.js](src/global/js/materialize.min.js)
      - [NoSleep.min.js](src/global/js/NoSleep.min.js)
    - **media/** - Any media files that can be used throughout the app
    - [robots.txt](src/global/robots.txt)
    - **view/** - Re-usable UI views
      - [credit.handlebars](src/global/view/credit.handlebars)
      - [error.handlebars](src/global/view/error.handlebars)
      - **layout/**
        - [empty-template.handlebars](src/global/view/layout/empty-template.handlebars)
        - [template.handlebars](src/global/view/layout/template.handlebars)
  - **services/** - Services that helps provide functionality to various smaller components that can be used in various app areas
    - [googleapiservice.js](src/services/googleapiservice.js)