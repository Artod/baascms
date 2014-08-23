/**
 * BaasCMS core v. 1.0.0
 * Copyright (c) 2014 Artod gartod@gmail.com
 * MIT License
*/

;(function(root, _, $, Path, undefined) {
    'use strict';
    
    root.BaasCMS = (root.BaasCMS || {});
    var BaasCMS = root.BaasCMS;

    BaasCMS.Router = (Path || function() {
        console.error('Requires Pathjs library.');
    });
    
    BaasCMS.Router.currentParams = (BaasCMS.Router.currentParams || {});

    BaasCMS.cons = {
        formFieldTypes: ['text', 'number', 'hidden', 'textarea', 'checkbox', 'select', 'google drive image', 'google drive file'],
        categoriesSelect: ['id', 'parent_id', 'name', 'pattern_name', 'count', 'icon', 'description', 'template', 'place']
    };

    BaasCMS.utils = {
        inherit: function (Child, Parent) {
            var F = function() {};
            F.prototype = Parent.prototype;

            Child.prototype = new F();
            Child.prototype.constructor = Child;
            Child.super = Parent.prototype;
        },
        collectDataForm: function($form) {
            var data = {};

            var serAr = new Array();

            $form.find('input, textarea, select').each(function() {
                var $this = $(this);

                if ( ( $this.is(':checkbox') || $this.is(':radio') ) &&  !$this.is(':checked') ) {
                    return;
                }

                var val = $this.val();

                serAr.push({
                    name: $this.attr('name'),
                    value: ($this.attr('type') === 'number' ? parseFloat( val.replace(',', '.') ) : val)
                });
            });

            for (var i in serAr) {
                if (typeof serAr[i].name === 'undefined') {
                    continue;
                }

                data[serAr[i].name] = serAr[i].value;
            }

            return data;

            var data = {};

            var serAr = $form.serializeArray();

            _.each(serAr, function(el) {
                data[el.name] = el.value;
            });

            return data;
        }    
    };

    BaasCMS.Cookie = {
        get: function(name) {
            var matches = document.cookie.match( new RegExp(
                    "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
                ) );

                return matches ? decodeURIComponent(matches[1]) : undefined;
        },
        set: function(name, value, props) {
            props = props || {};

            var exp = props.expires;
            if (typeof exp == 'number' && exp) {
                var d = new Date();
                d.setTime(d.getTime() + exp * 1000);
                exp = props.expires = d;
            }

            if (exp && exp.toUTCString) {
                props.expires = exp.toUTCString();
            }

            value = encodeURIComponent(value);

            var updatedCookie = name + '=' + value;
            for (var propName in props) {
                updatedCookie += '; ' + propName;
                var propValue = props[propName];
                if (propValue !== true) {
                    updatedCookie += '=' + propValue;
                }
            }

            document.cookie = updatedCookie;
        },
        del: function(name) {
            this.set(name, null, {
            expires: -1
            });
        }
    };

    BaasCMS.loadHomePage = function() {}; // for admin panel

    BaasCMS.Widget = (function() {
        function Widget(options) {       
            this.opts = _.extend({
                elementSelector: '',
                template: '',
                templateWrap: '',
                autoLoad: true,
                cache: 'yes',
                select: null,
                where: {},
                beforeQuery: function() {},
                afterQuery: function() {},
                beforeRender: function() {},
                afterRender: function() {}
            }, options);

            this.$el = $();
            
            var self = this;

            $(function() {
                self.$el = $(self.opts.elementSelector);
                
                Widget.$els = Widget.$els.filter(function() {
                    return $(this).parent().length; // check if el exists
                }).add(self.$el);

                if (self.opts.autoLoad) {
                    self.load();
                }
            });
        };
        
        Widget.$els = $(); // register widget $el

        _.extend(Widget.prototype, {
            load: function() {
                var self = this;

                this.get().done(function(data) {
                    self.render(data);
                });
            },
            compileTemplate: function(type, alternative) {
                var id = this.opts['template' + (type ? _.str.classify(type) : '')];
                        
                return _.template(
                    $('#' + id).html() ||
                    alternative ||
                    'Need to create template with id <i>' + id + '</i>.'
                );
            }
        });
        
        return Widget;
    })();
    BaasCMS.widgets = _.extend( (BaasCMS.widgets || {}), {
        Main: (function() {
            var Main = function(options) {
                var options = options || {};

                this.opts = _.extend({
                    elementSelector: '',                    
                    routes: {},
                    categoryOpts: {},
                    itemsOpts: {},
                    itemOpts: {},
                    autoLoad: true,
                    onRoute: function() {},
                    beforeHome: function() {},
                    afterHome: function() {},
                }, options);

                this.opts.itemsOpts['*'] = this.opts.itemsOpts['*'] || {}; // opts for all patterns
                
                this.routes = _.extend({}, this.opts.routes, {
                    '#/baascms/category/:cid(/page/:page)(/sort/:sort)': this.categoryOrItems,
                    '#/baascms/category/:cid/item/:iid': this.item
                });

                this.currentRoute = null;

                var self = this;

                this.$el = $();
                            
                $(function() {
                    self.$el = $(self.opts.elementSelector);

                    if (self.opts.autoLoad) {
                        self.initRoutes();                    
                    }
                });
            };

            _.extend(Main.prototype, {
                _onRoute: function(route) {
                    BaasCMS.Router.currentParams = route.params;
                    this.opts.onRoute.call(this, route);
                    BaasCMS.Widget.$els.trigger('route', route);
                },
                _newWidgetItems: function(patternName, params) {
                    var page = parseInt(params['page']) || 1;

                    var widget = new BaasCMS.widgets.Items( _.extend({
                            patternName: patternName,
                            elementSelector: this.opts.elementSelector,
                            autoLoad: false
                        }, this.opts.itemsOpts['*'], this.opts.itemsOpts[patternName]
                    ) );

                    widget.opts.skip = (page - 1) * widget.opts.limit;

                    if (params['sort']) {
                        widget.opts.sort = params['sort'];
                    }

                    _.extend(widget.opts.where, {
                        category_id: params['cid']
                    });

                    return widget;
                },
                reload: function() {
                    if (this.currentRoute && typeof this.currentRoute.run === 'function') {
                        this.currentRoute.run();
                    }
                },
                initRoutes: function() {
                    var self = this;

                    _.each(this.routes, function(action, route) {
                        BaasCMS.Router.map(route).to(function() {
                            self._onRoute(this);
                            
                            if ( _.isFunction(action) ) {
                                action.call(self, this.params);
                                self.currentRoute = this;
                            }
                        });
                    });

                    BaasCMS.Router.root('#/');
                        
                    BaasCMS.Router.rescue(function() {
                        this.params = this.params || {};                        
                        self._onRoute(this);                        
                        self.home();
                    });

                    BaasCMS.Router.listen();
                },
                startExpecting: function() {
                    var expectUid = _.uniqueId('baascms_expect_');

                    this.$el.data('baascms-expect', expectUid);

                    return expectUid;
                },
                fill: function(uid, html) {
                    if (this.$el.data('baascms-expect') !== uid) {
                        return;
                    }

                    this.$el.html(html);
                },
                home: function() {
                    if (this.opts.beforeHome.call(this) === false) {
                        return false;
                    }

                    this.startExpecting(); //occupy element

                    this.$el.html( _.template( $('#template-baascms-home').html(), {} ) );

                    this.opts.afterHome.call(this);
                },
                categoryOrItems: function(params) {
                    var cid = params['cid'],
                        expectUid = this.startExpecting(),
                        self = this;

                    BaasCMS.adapter.all('Category', {
                        select: BaasCMS.cons.categoriesSelect
                    }).done(function(dataCategories) {
                        var currentCategory = _.findWhere(dataCategories, {id: cid});
                        
                        if (!currentCategory) {
                            self.fill(expectUid, 'Category was not found.');

                            return;
                        }
                        
                        if (!currentCategory.pattern_name) {
                            var widgetCategory = new BaasCMS.widgets.Category( _.extend({
                                elementSelector: self.opts.elementSelector,
                                where: {
                                    id: cid
                                },
                                autoLoad: false
                            }, self.opts.categoryOpts) );
                            
                            widgetCategory.get().done(function(data) {
                                if ( expectUid !== self.$el.data('baascms-expect') ) {
                                    return;
                                }
                                
                                widgetCategory.render(data);
                            });

                            return;
                        }
                        
                        var widgetItems = self._newWidgetItems(currentCategory.pattern_name, params);
                        
                        widgetItems.get().done(function(itemsData) { // itemsData = { items: ..., categories: ..., pattern: ... }
                            if ( expectUid !== self.$el.data('baascms-expect') ) {
                                return;
                            }

                            var data = _.extend({
                                category: currentCategory,
                                page: parseInt(params['page']) || 1,
                                pages: currentCategory.count ? Math.ceil( currentCategory.count/(widgetItems.opts.limit || 1) ) : 1
                            }, itemsData);
                            
                            widgetItems.render(data);
                        });
                    });
                },
                item: function(params) {
                    var cid = params['cid'],
                        iid = params['iid'],
                        expectUid = this.startExpecting(),
                        self = this;

                    BaasCMS.adapter.all('Category', {
                        select: BaasCMS.cons.categoriesSelect
                    }).done(function(dataCategories) {
                        var category = _.findWhere(dataCategories, {id: cid}) || {};

                        if (!category.id) {
                            self.fill(expectUid, 'Category was not found.');

                            return;
                        }

                        if (!category.pattern_name) {
                            self.fill(expectUid, 'There is no pattern for this category.');

                            return;
                        }

                        var itemWidget = new BaasCMS.widgets.Item( _.extend({
                            elementSelector: self.opts.elementSelector,
                            patternName: category.pattern_name,
                            where: {
                                id: iid
                            },
                            autoLoad: false
                        }, self.opts.itemOpts[category.pattern_name]) );

                        itemWidget.get().done(function(data) {
                            self.fill( expectUid, itemWidget.render(data, true) );

                            itemWidget.opts.afterRender.call(itemWidget, data);
                        });
                    });
                }
            });

            return Main;
        })(),
        Category: (function() {
            BaasCMS.utils.inherit(Category, BaasCMS.Widget);
            
            function Category(options) {
                this.opts = _.extend({
                    template: 'template-baascms-category',
                    cache: 'no'
                }, options);
                
                Category.super.constructor.call(this, this.opts);
            }

            _.extend(Category.prototype, {
                get: function() {
                    if (this.opts.beforeQuery.call(this) === false) {
                        return;
                    }

                    var self = this;

                    return $.when(
                        BaasCMS.adapter.first('Category', {
                            select: this.opts.select,
                            where: this.opts.where, 
                            cache: this.opts.cache
                        }),
                        BaasCMS.adapter.all('Category', {
                            select: BaasCMS.cons.categoriesSelect                            
                        })
                    ).then(function(dataCategory, dataCategories) {
                        var data = {
                            category: dataCategory,
                            children: _.where(dataCategories, {parent_id: dataCategory.id})
                        };

                        self.opts.afterQuery.call(this, data);

                        return data;
                    });
                },
                render: function(data, justReturn) {
                    if (this.opts.beforeRender.call(this, data) === false) {
                        return;
                    }
                 
                    var specialTemplateHtml = data.category.template ? $('#' + data.category.template).html() : false;
                    
                    var template = specialTemplateHtml ? _.template(specialTemplateHtml) : this.compileTemplate();

                    var html = template({
                        routeParams: BaasCMS.Router.currentParams,
                        opts: this.opts,
                        data: data,
                        category: data.category
                    });

                    if (justReturn) {
                        return html;
                    }

                    this.$el.html(html);

                    this.opts.afterRender.call(this, data)
                }
            });

            return Category;
        })(),
        Categories: (function() {
            BaasCMS.utils.inherit(Categories, BaasCMS.Widget);
            
            function Categories(options) {
                this.opts = _.extend({
                    template: 'template-baascms-categories-element',
                    templateWrap: 'template-baascms-categories-wrap',
                    select: BaasCMS.cons.categoriesSelect,
                    where: null,
                    onRoute: function() {}
                }, options);
                
                Categories.super.constructor.call(this, this.opts);
                
                var self = this;                
                $(function() {
                    self.$el.on('route', function(e, route) {
                        self.opts.onRoute.call(self, route);
                    });
                });
            }

            _.extend(Categories.prototype, {
                get: function() {
                    if (this.opts.beforeQuery.call(this) === false) {
                        return;
                    }
                    
                    var param = {
                        select: this.opts.select
                    };

                    if (this.opts.where) { // for caching query
                        param.where = this.opts.where;
                    }

                    var self = this;

                    return BaasCMS.adapter.all('Category', param).then(function(dataCategories) {
                        var data = {
                            categories: dataCategories
                        };
                        
                        self.opts.afterQuery.call(self, data);
                        
                        return data;
                    });
                },
                render: function(data, justReturn) {
                    if (this.opts.beforeRender.call(this, data) === false) {
                        return;
                    }
                        
                    var template = this.compileTemplate(),
                        templateWrap = this.compileTemplate('wrap');

                    var self = this;

                    var recurs = function(children, level) {
                        var out = '';

                        _.each(children, function(category) {
                            var subcats = _.where(data.categories, {parent_id: category.id});

                            var htmlChildren = (subcats.length ? templateWrap({
                                routeParams: BaasCMS.Router.currentParams,
                                opts: self.opts,
                                level: level + 1,
                                htmlElements: recurs(subcats, level + 1)
                            }) : '');

                            out += template({
                                routeParams: BaasCMS.Router.currentParams,
                                opts: self.opts,
                                category: category,
                                level: level,
                                htmlChildren: htmlChildren                                
                            });
                        });

                        return out;
                    };

                    var categoriesWithoutParent = [];
                    _.each(data.categories, function(category) {
                        if ( _.findWhere(data.categories, {id: category.parent_id}) ) {
                            return;
                        }
                        
                        categoriesWithoutParent.push(category);
                    });
                    
                    var htmlElements = recurs(categoriesWithoutParent, 0);
                    
                    if (justReturn) {
                        return htmlElements;
                    }
                    
                    this.$el.html( templateWrap({
                        routeParams: BaasCMS.Router.currentParams,
                        opts: this.opts,
                        level: 0,
                        htmlElements: htmlElements
                    }) );
                    
                    this.opts.afterRender.call(this, data);
                }
            });

            return Categories;
        })(),
        Item: (function() {
            BaasCMS.utils.inherit(Item, BaasCMS.Widget);
            
            function Item(options) {
                this.opts = _.extend({
                    patternName: '',
                    cache: 'no'
                }, options);

                this.opts.template = (this.opts.template || 'template-baascms' + _.str.dasherize(this.opts.patternName) + '-item');

                Item.super.constructor.call(this, this.opts);
            };

            _.extend(Item.prototype, {
                get: function() {
                    if (this.opts.beforeQuery.call(this) === false) {
                        return;
                    }

                    var self = this;

                    return $.when(
                        BaasCMS.adapter.all('Category', { // all for cache
                            select: BaasCMS.cons.categoriesSelect
                        }),
                        BaasCMS.adapter.all('Pattern'), // all for cache
                        BaasCMS.adapter.first(this.opts.patternName, {
                            cache: this.opts.cache,
                            select: this.opts.select,
                            where: this.opts.where
                        })
                    ).then(function(dataCategories, dataPatterns, dataItem) {
                        var data = {
                            category: _.findWhere(dataCategories, {id: dataItem.category_id}) || {},
                            item: dataItem
                        };

                        data.pattern = _.findWhere(dataPatterns, {name: data.category.pattern_name}) || {};

                        self.opts.afterQuery.call(this, data);

                        return data;
                    });
                },
                render: function(data, justReturn) {
                    if (this.opts.beforeRender.call(this, data) === false) {
                        return;
                    }

                    var template = this.compileTemplate( '', $('#template-baascms-item').html() );

                    var html = template({
                        routeParams: BaasCMS.Router.currentParams,
                        opts: this.opts,
                        data: data,
                        item: data.item
                    });

                    if (justReturn) {
                        return html;
                    }

                    this.$el.html(html);

                    this.opts.afterRender.call(this, data)
                }
            });

            return Item;
        })(),
        Items: (function() {
            BaasCMS.utils.inherit(Items, BaasCMS.Widget);
            
            function Items(options) {
                this.opts = _.extend({
                    patternName: '',
                    cache: 'no',
                    sort: '-createdAt',
                    limit: 20,
                    skip: 0
                }, options);

                var dasherized = _.str.dasherize(this.opts.patternName);

                this.opts.templateWrap = (this.opts.templateWrap || 'template-baascms' + dasherized + '-items-wrap');
                this.opts.template = (this.opts.template || 'template-baascms' + dasherized + '-items-element');

                Items.super.constructor.call(this, this.opts);
            }

            _.extend(Items.prototype, {
                get: function(data) {
                    if (this.opts.beforeQuery.call(this, data) === false) {
                        return;
                    }

                    var sort = this.opts.sort,
                        self = this;

                    return $.when(
                        BaasCMS.adapter.all('Category', {
                            select: BaasCMS.cons.categoriesSelect
                        }),
                        BaasCMS.adapter.all('Pattern'),
                        BaasCMS.adapter.all(this.opts.patternName, {
                            cache: this.opts.cache,
                            select: this.opts.select,
                            where: this.opts.where,
                            limit: this.opts.limit,
                            skip: this.opts.skip,
                            order: sort
                        })
                    ).then(function(dataCategories, dataPatterns, dataItems) {
                        var data = {
                            items: dataItems,
                            categories: dataCategories,
                            pattern: _.findWhere(dataPatterns, {name: self.opts.patternName}) || {}
                        };

                        self.opts.afterQuery.call(self, data);

                        return data;
                    });
                },
                render: function(data, justReturn) {
                    if (this.opts.beforeRender.call(this, data) === false) {
                        return;
                    }

                    var self = this;

                    var template = this.compileTemplate( '', $('#template-baascms-items-element').html() ), // second param is alternative template
                        templateWrap = this.compileTemplate( 'wrap', $('#template-baascms-items-wrap').html() ),
                        htmlElements = '';

                    _.each(data.items, function(item) {
                        htmlElements += template({
                            routeParams: BaasCMS.Router.currentParams,
                            opts: self.opts,
                            data: data,
                            item: item
                        });
                    });

                    if (justReturn === 'el') {
                        return htmlElements;
                    }

                    var html = templateWrap({
                        routeParams: BaasCMS.Router.currentParams,
                        opts: this.opts,
                        data: data,
                        htmlElements: htmlElements
                    });

                    if (justReturn) {
                        return html;
                    }

                    this.$el.html(html);

                    this.opts.afterRender.call(this, data);
                }
            });

            return Items;
        })(),
        Breadcrumbs: (function() {
            BaasCMS.utils.inherit(Breadcrumbs, BaasCMS.Widget);

            function Breadcrumbs(options) {
                this.opts = _.extend({
                    elementSelector: '',
                    //autoLoad: false, // otherwise double load on start
                    template: 'template-baascms-breadcrumbs-element',
                    templateWrap: 'template-baascms-breadcrumbs-wrap'
                }, options);

                var self = this;
                
                Breadcrumbs.super.constructor.call(this, this.opts);
                
                var self = this;                
                $(function() {
                    self.$el.on('route', function(e, route) {
                        self.load();
                    });
                });
            }

            _.extend(Breadcrumbs.prototype, {
                get: function() {
                    var self = this;

                    return BaasCMS.adapter.all('Category', {
                        select: BaasCMS.cons.categoriesSelect
                    }).then(function(dataCategories) {
                        var data = {
                            categories: dataCategories
                        };
                        
                        self.opts.afterQuery.call(self, data);
                        
                        return data;
                    });
                },
                render: function(data) {
                    if (this.opts.beforeRender.call(this, data) === false) {
                        return;
                    }

                    var self = this,
                        ancestors = [];

                    var recurs = function(ancestor) {
                        if (!ancestor) {
                            return;
                        }
                        
                        ancestors.push(ancestor);
                        
                        recurs( _.findWhere(data.categories, { id: ancestor.parent_id }) );
                    };

                    recurs( _.findWhere(data.categories, { id: BaasCMS.Router.currentParams['cid'] }) );
                    
                    ancestors.reverse();
                    
                    var templateWrap = this.compileTemplate('wrap'),
                        template = this.compileTemplate(),
                        htmlElements = '';
                    
                    _.each(ancestors, function(ancestor) {
                        htmlElements += template({
                            routeParams: BaasCMS.Router.currentParams,
                            opts: self.opts,
                            category: ancestor
                        })
                    });
                    
                    this.$el.html( templateWrap({
                        routeParams: BaasCMS.Router.currentParams,
                        opts: this.opts,
                        htmlElements: htmlElements
                    }) );
                    
                    this.opts.afterRender.call(this, data);                    
                }
            });

            return Breadcrumbs;
        })()
    });

    BaasCMS.adapters = (BaasCMS.adapters || {});
    BaasCMS.Adapter = (function() {
        var _dummy = function() {
            console.error('Adapter does not support this method.');
        };

        function Adapter(adapter, opts) {
            this.opts = _.extend({
                cmsOpts: {},
                onStart: function() {},
                onComplete: function() {},
                onError: function() {}
            }, opts);

            this._cache = {};

            this._countCurrentQueries = 0;
            this.busy = false;

            this._concurrents = {};

            if (typeof adapter === 'function') {
                _.extend( this, new adapter(opts.cmsOpts) );
            }
        }

        Adapter.prototype = {
            _query: _dummy,
            _count: _dummy,
            _save: _dummy,
            _del: _dummy,
            onStart: function() {
//this._cache = {};
                this._countCurrentQueries++;
                this.busy = true;

                var queryUid = _.uniqueId('baascms_query_');
                this.opts.onStart(queryUid);

                return queryUid;
            },
            onComplete: function(queryUid) {
                this._countCurrentQueries--;
                this.opts.onComplete(queryUid);

                var self = this;

                setTimeout(function() {
                    if (self._countCurrentQueries === 0) {
                        self.busy = false;
                    }
                }, 1);
            },
            query: function(modelName, idOrOpts, opts) {
                var id = ( _.isString(idOrOpts) ? idOrOpts : '' ),
                    opts = ( _.isObject(idOrOpts) ? idOrOpts : (opts || {}) ),
                    deferred = $.Deferred(),
                    cacheKey = 'query_' + id + '_' + JSON.stringify(opts),
                    concurrentsKey = modelName + '_' + cacheKey,
                    self = this;
                    
                if ( opts.cache === 'no' || !this._cache[modelName] || _.isUndefined(this._cache[modelName][cacheKey]) ) {
                    if (this._concurrents[concurrentsKey]) {
// console.log('Concurrents ' + cacheKey);
                       return this._concurrents[concurrentsKey].promise();
                    }

                    this._concurrents[concurrentsKey] = deferred;

                    var queryUid = this.onStart();

                    var query = opts.count ? this._count(modelName, opts, deferred) : this._query(modelName, id, opts, deferred);

                    query.done(function(data) {
                        self._cache[modelName] = self._cache[modelName] || {};
                        self._cache[modelName][cacheKey] = JSON.stringify(data);
                    }).fail(function(error) {
                        self.opts.onError(modelName, 'query', error);
                    }).always(function() {
                        delete self._concurrents[concurrentsKey];
                        self.onComplete(queryUid);
                    });

                } else {
                    deferred.resolve( JSON.parse(this._cache[modelName][cacheKey]) );
//console.log('Get cache '+ modelName + ': ' + cacheKey);
                }

                return deferred.promise();
            },
            getById: function(modelName, id, opts) {
                var opts = opts || {};
                opts.first = true;

                return this.query(modelName, id, opts);
            },
            first: function(modelName, opts) {
                var opts = opts || {};
                opts.first = true;

                return this.query(modelName, opts);
            },
            all: function(modelName, opts) {
                return this.query(modelName, opts);
            },
            count: function(modelName, opts) {
                var opts = opts || {};
                opts.count = true;

                return this.query(modelName, opts);
            },
            save: function(modelName, opts) {
                var deferred = $.Deferred(),
                    opts = opts || {},
                    self = this;

                var queryUid = this.onStart();

                return this._save(modelName, opts, deferred).done(function(id) {
                    delete self._cache[modelName];
                }).fail(function(error) {
                    self.opts.onError(modelName, 'save', error);
                }).always(function() {
                    self.onComplete(queryUid);
                });
            },
            del: function(modelName, ids) {
                var ids = ids || '',
                    deferred = $.Deferred(),
                    self = this;

                ids = _.isArray(ids) ? ids : [ids];

                var queryUid = this.onStart();

                return this._del(modelName, ids, deferred).done(function() {
                    delete self._cache[modelName];
                }).fail(function(error) {
                    self.opts.onError(modelName, 'delete', error);
                }).always(function() {
                    self.onComplete(queryUid);
                });
            }
        };

        return Adapter;
    })();

    BaasCMS.message = function(message, type, delay) {
        var $messages = $('#baascms-messages'),
            template = _.template( $('#template-baascms-message').html() || '' );

        if (type === 'danger') {
            console.error(message);
        }

        $messages.fadeIn().append(template({
            message: message,
            type: type
        }) );

        var $newMessage = $messages.children().last();

        setTimeout(function() {
            $newMessage.fadeOut(function() {
                $(this).remove();

                if ( !$messages.children().length ) {
                    $messages.hide();
                }
            });
        }, delay || 3000);
    };

    BaasCMS.inited = BaasCMS.inited || false;
    BaasCMS.init = function(options) {
        BaasCMS.opts = _.extend({
            baas: 'Parse',
            onError: function(modelName, type, error) {
                BaasCMS.message('Error ' + type + ' ' + modelName + ': ' + error.message, 'danger');
            },
            loaderDelay: 300
        }, options);

        var loaderCounter = 0,
            loaderTimeouts = [],
            $loader = $();

        $(function() {
            $loader = $('#baascms-loader');
        });

        BaasCMS.adapter = new BaasCMS.Adapter(BaasCMS.adapters[BaasCMS.opts.baas], {
            cmsOpts: BaasCMS.opts,
            onError: function(modelName, type, error) {
                BaasCMS.opts.onError(modelName, type, error);
            },
            onStart: function(queryUid) {
                loaderTimeouts[queryUid] = setTimeout(function() {
                    loaderTimeouts[queryUid] = 0;
                    loaderCounter++;
                    $loader.show();
                }, BaasCMS.opts.loaderDelay);
            },
            onComplete: function(queryUid) {
                clearTimeout(loaderTimeouts[queryUid]);

                if (loaderTimeouts[queryUid] === 0) { // time is up, loader is shown
                    loaderCounter--;
                }

                delete loaderTimeouts[queryUid];

                if (loaderCounter <= 0) {
                    $loader.hide();
                }
            }
        });

        BaasCMS.inited = true;
    };

})(window, window._, window.jQuery, window.Path);