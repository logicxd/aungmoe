---
title:  "Xcode Debugging Tips You May Not Know"
date:   2019-02-18
updatedDate: 2019-01-18
category: Tools
urlName: xcode-debugging-tips-you-may-not-know
---

Whether you are looking for bugs, figuring out how the code flows, or
experimenting your new feature, knowing how to use the debugger will save you a
lot of time. I use the debugger basically every single time I run my application.
It is also an excellent tool to use to learn how programming works. I just wish
school taught this in my early beginner computer science classes. Instead,
I was first introduced this when I did my first coding internship.

I'll be going over some techniques that I use the most. I highly recommend
reading through [objc.io's debugging tips](https://www.objc.io/issues/19-debugging/lldb-debugging/)
for a more inclusive reading.

## The Basics

Quick overview of the basics. You need to know this. Period.

* Step Over - execute the current line and stop before executing the next line.
* Step In - go inside the method at the current line. If it's already run, finish
executing the current line and stop before executing the next line.
* Step Out - finish executing the current block and return to the caller.
* `po` - print out details about the variable. `po myVariable`.
* `e`, `expr`, `expression` - execute the command. `e myVariable = @"new"`.

## All Objective-C Exceptions Breakpoint

Catch it before the crash. This exception breakpoint is a major life saver.
When there is an exception thrown, the application will just crash and give
you the error stack trace in the Xcode output. When this is enabled, you will
hit a breakpoint right at the line before the application crashes. Then you can
look at your variables and see what's exactly going on that's causing the crash.

To turn it on:

* Open up the Navigator
* Click on the 'Breakpoint navigator' tab
* Click on the '+' sign at the bottom to make a new 'Exception Breakpoint'

That's all it is! But you can do more to get the most out:

* When the breakpoint hits, set it so that the exception will print out the
error message from running this command: `po $arg1`.
* Set exception on 'Objective-C' only. This will ignore any C++ exceptions if
you don't want to see them.

## Return from a Method

Examples: `thread return`, `thread return NO`, `thread return myVariable`.

Great for stubbing methods. Quickly return from a method with the value that you
want. Let's say that you wanted to test this method that can return multiple
values. Instead of changing the value, re-compiling and running it, you can just
put a breakpoint here and return the value that you want!

## Skip/Jump Executing Lines

Examples: `thread jump --by 2`, `thread jump --line 102`

I use this when I don't want 

## Import UIKit

Example: `e @import UIKit`

You hit a breakpoint and you want to print a view's bounds by calling
`po view.bounds`. Instead of getting the view's bounds, you may have gotten some
garbage output such as:

* error: unsupported expression with unknown type
* error: 'bounds' has unknown return type; cast the call to its declared return type

To fix it, you may have called it by calling it as a method and also specify the
return type by doing `po (CGRect)[self bounds]`. Well, instead of typing all that
mess everytime you want to print something, you can just do do `e @import UIKit`
and you will be allowed to do `po view.bounds` and all the other methods that comes
with UIKit.

## Snapshot of a View