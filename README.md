# Project Installation

1. Run `npm install`
2. Install nodemon if you haven't with `npm install --global nodemon`
3. Need a `.env` file for all the keys

## Example of `.env` file

```
MONGODB_BOOKMARK_CONNECTION_STRING=<YOUR KEY>
SESSION_SECRET=<YOUR KEY>
YELP_API=<YOUR KEY>
```

## Updating Packages

* Check packages: `npx npm-check`
* Update packages: `npx npm-check -u`

## Deploy Instructions

* Follow https://fly.io/docs/hands-on/install-flyctl/ 