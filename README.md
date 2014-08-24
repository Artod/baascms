# BaasCMS #

JavaScript CMS using popular [BaaS](http://en.wikipedia.org/wiki/Backend_as_a_service) providers as a backend (currently only supports Parse.com)

Copyright (c) 2014 Artod gartod@gmail.com

MIT License.


## Demo ##

* [Demo App on GitHub Pages](https://artod.github.io/baascms/demo/#/)
* [Demo App on Tumblr](http://baascms.tumblr.com/#/)

You can see the [Admin Panel](https://artod.github.io/baascms/admin/parse/#/) for the Demo App with the keys below:

* Application ID: nM7P7NnFA95CK1WrqWOf9wa3mskctaTOdk9vYflj
* Javascript Key: 0zHfA9FG8L1xR699qmFXjxkZ1pDxgml0MWZMpqJG


## Dependencis ##

* [Underscore.js](http://underscorejs.org/)
* [Underscore.string](http://epeli.github.io/underscore.string/)
* [jQuery](http://jquery.com/)
* [PathJS](http://mtrpcic.github.io/pathjs/)
* [Parse JavaScript SDK](https://www.parse.com) (for Parse.com version)


## Quick Start Guide ##

Start working with BaasCMS (Parse.com version) by following these steps:

1. Sign up for [Parse.com](https://www.parse.com/#signup)
1. Create a [new app](https://www.parse.com/apps/new).
1. Copy *Application ID* and *Javascript Key* of your app and paste them into the appropriate form on the [BaasCMS Admin Panel](https://artod.github.io/baascms/admin/parse/#).

After that, you can work with the Admin Panel. Build structure of your future web app by creating [new patterns](https://artod.github.io/baascms/admin/parse/#/baascms/pattern/add) and [new categories](https://artod.github.io/baascms/admin/parse/#/baascms/category/add).

Each category has the property *Pattern name* with list of the created patterns. Specifying *Pattern name* will allow you to add *items* with custom fields.

Use the sample [baascms.parse.html](https://github.com/Artod/baascms/blob/master/baascms.parse.html) to start customizing the front-face of your app:

1. Create a new file in an editor and paste contents of the file *baascms.parse.html*.
1. Find the line with `Parse.initialize('YOUR-APPLICATION-ID-HERE', 'YOUR-JAVASCRIPT-KEY-HERE');` and specify your *Application ID* and *Javascript Key*.
1. Save the file (i.e., as **my-baascms-fronface.html**) and upload it to your hosting account.

If you do not have a hosting, you can use [GitHub Pages](https://pages.github.com/) or [Tumblr](https://www.tumblr.com/dashboard) or any other suitable services.

Tumblr as a hosting for your app:

1. Sign up for [Tumblr](https://www.tumblr.com/register) or just [create a new blog](https://www.tumblr.com/new/blog).
1. Go to the [dashboard](https://www.tumblr.com/dashboard) and click the link *castomize* on the right sidebar.
1. Click the link *Edit HTML* on the left sidebar.
1. In the sidebar that appears, remove all and paste contents of your file *my-baascms-fronface.html*.
1. Update preview and Save.
1. Go to your tumblr blog at *{YOUR-BLOG-NAME}.tumblr.com*.












## TODO ##

* Documentations
* Code comments
* Tests
