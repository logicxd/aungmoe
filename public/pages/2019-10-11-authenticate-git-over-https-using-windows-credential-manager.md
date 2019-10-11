---
title:  "Authenticate Git over HTTPS using Windows Credential Manager"
date:   2019-10-11
updatedDate: 2019-10-11
category: Tools
urlName: authenticate-git-over-HTTPS-using-windows-credential-manager
---

Today I needed to sync down a repository using git.
But the server doesn't support SSH.
So I had to use HTTPS, which is fine.
I've used it before and it was pretty straight forward.
It just asks for my credentials before performing pulling or pushing, right?
And then I ran `git clone` for the first time and ran into this.

<img src='/media/images/git_https_failed_authentication.png'>

Ok, what is this? Never seen this before. And I spent like 2 hours trying
to get this to work and found a few ways:

* Store
* Git Credential Manager
* Window's Credential Manager

`git config --global credential.helper store`
* `vi ~/.git-credentials`
`git config --global credential.helper manager`
`git config --global credential.helper wincred`