# Project Installation

1. Run `npm install`
2. Install nodemon if you haven't with `npm install --global nodemon`
3. Need a `config/secrets.json` file for all the keys

## Example of secrets.json

```
{
    "MONGODB_BOOKMARK_CONNECTION_STRING": "",
    "SESSION_SECRET": "",
    "YELP_API": ""
}
```

## Updating Packages

* Check packages: `npx npm-check`
* Update packages: `npx npm-check -u`

## Deploy Instructions

* Follow https://fly.io/docs/hands-on/install-flyctl/ 