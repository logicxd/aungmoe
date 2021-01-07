---
title:  "Combine Bills Using Gmail"
date:   2021-01-07
updatedDate: 2021-01-07
category: NodeJS
urlName: combine-bills-using-gmail
---

I wanted to automate combining my monthly bills to share it with my roommates so I created this script. Let me know what you guys think!

<https://github.com/logicxd/Combine-Bills-Using-Gmail>

## Preview from GitHub

Customizable and extensible way of collecting all your bills before sending out an email with a final receipt to your recipients.

From emails in your inbox:
![Inbox Emails](https://user-images.githubusercontent.com/12219300/103873116-2dd87e00-5084-11eb-8ab6-d4c1b7be8ec6.png)

To sending out:
![Composed Email](https://user-images.githubusercontent.com/12219300/103457672-18470b00-4cb6-11eb-9e84-5c69af90e90a.png)

## How It Works

General idea:

1. Fetches Gmails with the labels you provided.
2. Runs each email through the scripts (that you provide) to parse the amount. This includes reading and attaching files!
3. Adds any additional custom scripts that you may have.
4. Finally, composes an email using the parsed data to create a "final" receipt to send to your recipients.

An example of how I use it:

1. I get utility bills on my primary email account.
2. Forward them to my dev email account. This is to limit what emails you can access using Google API for safety.
3. Create filters to label my utility bills by water and electricity.
4. Write email scripts to extract the amount.
5. Download code on my raspbery pi and schedule it to run every month to send me monthly aggregated bills 🎉.

Check out the [GitHub repository](https://github.com/logicxd/Combine-Bills-Using-Gmail) for a more extensive writeup.
