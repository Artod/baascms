# BaasCMS #

JavaScript CMS using popular [BaaS](http://en.wikipedia.org/wiki/Backend_as_a_service) providers as a backend (currently only supports Parse.com)

Copyright (c) 2014 Artod gartod@gmail.com

MIT License.


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
1. After that, you can work with the Admin Panel. Build structure of your future web app by creating [new patterns](https://artod.github.io/baascms/admin/parse/#/baascms/pattern/add) and [new categories](https://artod.github.io/baascms/admin/parse/#/baascms/category/add). Each category has the property *Pattern name* with list of the created patterns. Specifying *Pattern name* will allow you to add *items* with custom fields.
1. Use the sample [baascms.parse.html](https://github.com/Artod/baascms/blob/master/baascms.parse.html) to start customizing the front-face of your app. Find the line with `Parse.initialize('YOUR-APPLICATION-ID-HERE', 'YOUR-JAVASCRIPT-KEY-HERE');` and specify your *Application ID* and *Javascript Key*.





## TODO ##

* Documentations
* Code comments
* Tests