---
title:  "Authenticate Git over HTTPS"
date:   2019-10-11
updatedDate: 2019-10-11
category: Tools
urlName: authenticate-git-over-HTTPS
---

Today I needed to sync down a repository using git.
So I went to look for my usual SSH authentication to pull down the repo but
noticed that option isn't available. the server doesn't support SSH.
Which means I had to use HTTPS, which is fine, I've used it before and it was
pretty straight forward. I'll just have to enter my credentials before every
pulling or pushing. And then I ran `git clone` for the first time and ran into this:

<div class='center'>
    <img src='/blog/media/git_https_failed_authentication.png'>
</div>

Ok, what is this? Isn't it supposed to just ask me for my credentials every time?
And begins my search for how to get this working. Here are different ways I've
found to save my information so I don't have to type it again next time:

* Git's Credential Storage
* Git Credential Manager (GCM)
* Window's Credential Manager
* OSX Keychain

**TLDR** - Jump to "Window's Credential Manager". Oh and these are all for windows. I haven't tried on a Mac yet.

## Git's Credential Storage

This is pretty straight forward and by far the simplest solution.
Basically you choose between these commands:

* The default (if credential.helper is unset) it will ask you for your 
    credentials every time. You can unset by calling this:
    `git config --global --unset credential.helper`
* `git config --global credential.helper cache` - saved in memory for 15 minutes
* `git config --global credential.helper store` - saved as plain text on disk (permanent)

So I found what I want, which is the `store` option. BUT I don't want to save it
as plain text for security reasons. Someone can steal your entire repository if
they can access the file. Just type `cat ~/.git-credentials` to find it 😎.
You could specify a different location but it's still in plain text. Let's move on.

More info here: https://git-scm.com/book/en/v2/Git-Tools-Credential-Storage

## Git Credential Manager (GCM)

Ok I never got this to work but this is supposed to be the best as it allows
multilevel authentication (such as 2FA). You have to install
[Git Credential Manager](https://github.com/microsoft/Git-Credential-Manager-for-Windows)
and it's supposed to work right out of the box, _silently_.
Sounds great but the installation fails and I ran out of patience. Will come back
to it later in the future.

Theorectically, you would just have to set it to use GCM by calling
`git config --global credential.helper manager`. Then make sure your GCM
is installed by running `git credential-manager install`. And we're set.
But I was getting deployment error when trying to install GCM.

## Window's Credential Manager

This is the one I ended up using and it works for my case. And it was very easy.

* Run `git config --global credential.helper wincred`.
* Run `git clone` or `git pull` or any remote related git operation.
* It'll ask for your username and password.
* Then it's saved in the Credential Manager, **ENCRYPTED**.

## OSX Keychain

This is for Mac only. Just set `git config --global credential.helper osxkeychain`.
No other work is needed and it works great :D
