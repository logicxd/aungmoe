# Project Installation

1. Run `npm install`
2. Install nodemon if you haven't with `npm install --global nodemon`
3. Need a `.env` file for all the keys

## Example of `.env` file

```
MONGODB_BOOKMARK_CONNECTION_STRING=<YOUR KEY>
SESSION_SECRET=<YOUR KEY>
YELP_API=<YOUR KEY>
GOOGLE_API=<YOUR KEY>
```

* Don't use the same Google API as for javascript maps as that is exposed to public
* Generate a local Google API key for localhost development at https://console.cloud.google.com/apis/credentials?project=map-it-notion then delete after use

## Updating Packages

* Check packages: `npx npm-check`
* Update packages: `npx npm-check -u`

## Deploy Instructions

* Follow https://fly.io/docs/hands-on/install-flyctl/ 