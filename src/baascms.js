/**
 * BaasCMS core v. 1.0.0
 * Copyright (c) 2014 Artod gartod@gmail.com
 * MIT License
*/

;(function(window, document, _, $, undefined) {
    'use strict';
    
    window.BaasCMS = (window.BaasCMS || {});
    var BaasCMS = window.BaasCMS;

    BaasCMS.Router = (window.Path || function() {
        console.error('Requires Pathjs library.');
    });

    BaasCMS.cons = {
        formFieldTypes: ['text', 'number', 'hidden', 'textarea', 'checkbox', 'select', 'google drive image', 'google drive file'],
        categoriesSelect: ['id', 'parent_id', 'name', 'pattern_name', 'count', 'icon']
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

    BaasCMS.cookie = {
        get: function(name) {
            var matches = document.cookie.match(new RegExp(
                    "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
                ));

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
                beforeQuery: function() {},
                afterQuery: function() {},
                beforeRender: function() {},
                afterRender: function() {}
            }, options);

            this.$el = $();
            
            var self = this;

            $(function() {
                self.$el = $(self.opts.elementSelector);
                
                if (self.opts.autoLoad) {
                    self.load();
                }
            });
        };
        
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
                    category: {},
                    items: {},
                    item: {},
                    beforeHome: function() {},
                    afterHome: function() {},
                }, options);

                this.routes = _.extend({}, this.opts.routes, {
                    '#/baascms/category/:cid(/page/:page)(/sort/:sort)': this.categoryOrItems,
                    '#/baascms/category/:cid/item/:iid': this.item
                });

                this.currentRoute = null;

                var self = this;

                this.$el = $();

                $(function() {
                    self.$el = $(self.opts.elementSelector);
                    self.initRoutes();
                });
            };

            _.extend(Main.prototype, {
                load: function() {
                    if (this.currentRoute && typeof this.currentRoute.run === 'function') {
                        this.currentRoute.run();
                    }
                },
                initRoutes: function() {
                    var self = this;

                    _.each(this.routes, function(action, route) {
                        BaasCMS.Router.map(route).to(function() {
                            $(BaasCMS.widgets).trigger('route', this);

                            if ( _.isFunction(action) ) {
                                action.call(self, this.params);
                                self.currentRoute = this;
                            }
                        });
                    });

                    Path.root('#/baascms');

                    BaasCMS.Router.rescue(function() {
                        $(BaasCMS.widgets).trigger('route', this);

                        self.home();
                    });

                    BaasCMS.Router.listen();
                },
                startWaiting: function() {
                    var waitfor = _.uniqueId('waitfor_');

                    this.$el.data('waitfor', waitfor);

                    return waitfor;
                },
                fill: function(uid, html) {
                    var waitfor = this.$el.data('waitfor');

                    if (waitfor && waitfor !== uid) {
                        return;
                    }

                    this.$el.html(html);
                },
                home: function() {
                    if (this.opts.beforeHome.call(this) === false) {
                        return false;
                    }

                    this.startWaiting();

                    this.$el.html( _.template( $('#template-baascms-home').html(), {} ) );

                    this.opts.afterHome.call(this);
                },
                newWidgetItems: function(patternName, params) {
                    var page = parseInt(params['page']) || 1;

                    var widget = new BaasCMS.widgets.Items( _.extend({
                            patternName: patternName,
                            elementSelector: this.opts.elementSelector,
                            autoLoad: false
                        }, this.opts.items[patternName]
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
                categoryOrItems: function(params) {
                    var cid = params['cid'],
                        waitfor = this.startWaiting(),
                        self = this;
                        
                    BaasCMS.adapter.all('Category', {
                        select: BaasCMS.cons.categoriesSelect
                    }).done(function(dataCategories) {
                        var currentCategory = _.findWhere(dataCategories, {id: cid});
                        
                        if (!currentCategory.id) {
                            self.fill(waitfor, 'Category was not found.');

                            return;
                        }
                        
                        if (!currentCategory.pattern_name) {
                            var widgetCategory = new BaasCMS.widgets.Category( _.extend({
                                elementSelector: self.opts.elementSelector,
                                where: {
                                    id: cid
                                },
                                autoLoad: false
                            }, self.opts.category) );
                            
                            widgetCategory.get().done(function(data) {
                                self.fill(waitfor, widgetCategory.render(data, true));
                                
                                widgetCategory.opts.afterRender.call(widgetCategory, data);
                            });

                            return;
                        }
                        
                        var widgetItems = self.newWidgetItems(currentCategory.pattern_name, params);

                        widgetItems.get().done(function(itemsData) { // itemsData = { items: ..., categories: ..., pattern: ... }
                            var data = _.extend({
                                category: currentCategory,
                                page: parseInt(params['page']) || 1,
                                pages: currentCategory.count ? Math.ceil( currentCategory.count/(widgetItems.opts.limit || 1) ) : 1
                            }, itemsData);

                            self.fill( waitfor, widgetItems.render(data, true) );

                            widgetItems.opts.afterRender.call(widgetItems, data);
                        });
                    });
                },
                item: function(params) {
                    var cid = params['cid'],
                        iid = params['iid'],
                        waitfor = this.startWaiting(),
                        self = this;

                    BaasCMS.adapter.all('Category', {
                        select: BaasCMS.cons.categoriesSelect
                    }).done(function(dataCategories) {
                        var category = _.findWhere(dataCategories, {id: cid});

                        if (!category) {
                            self.fill(waitfor, 'Category was not found.');

                            return;
                        }

                        if (!category.pattern_name) {
                            self.fill(waitfor, 'There is no pattern for this category.');

                            return;
                        }

                        var itemWidget = new BaasCMS.widgets.Item( _.extend({
                            elementSelector: self.opts.elementSelector,
                            patternName: category.pattern_name,
                            iid: iid,
                            autoLoad: false
                        }, self.opts.item[category.pattern_name]) );

                        itemWidget.get().done(function(data) {
                            self.fill( waitfor, itemWidget.render(data, true) );

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
                    cache: 'no',
                    select: null,
                    where: {}
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

                    var template = this.compileTemplate();

                    var html = template({
                        cid: this.opts.cid,
                        category: data.category,
                        children: data.children
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
                    template: 'template-baascms-category-element',
                    templateWrap: 'template-baascms-category-wrap',
                    select: BaasCMS.cons.categoriesSelect,
                    where: null,
                    onEnter: function() {}
                }, options);

                this.currentCid = '';                

                var self = this;
                
                $(BaasCMS.widgets).on('route', function(e, route) {
                    self.currentCid = route.params ? route.params['cid'] : 0;
                    self.opts.onEnter.call(self);
                });
                
                Categories.super.constructor.call(this, this.opts);
            };

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

                        _.each(children, function(category, i) {
                            var subcats = _.where(data.categories, {parent_id: category.id});
                            
                            var htmlChildren = (subcats.length ? templateWrap({
                                htmlElements: recurs(subcats, level + 1)
                            }) : '');

                            out += template({
                                category: category,
                                level: level,
                                currentCid: self.currentCid,
                                htmlChildren: htmlChildren                                
                            });
                        });

                        return out;
                    };

                    var htmlElements = recurs( _.where(data.categories, {parent_id: ''}), 0 );
                    
                    if (justReturn) {
                        return htmlElements;
                    }
                    
                    this.$el.html(templateWrap({
                        htmlElements: htmlElements
                    }));
                    
                    this.opts.afterRender.call(this, data);
                }
            });

            return Categories;
        })(),
        Item: (function() {
            BaasCMS.utils.inherit(Item, BaasCMS.Widget);
            
            function Item(options) {
                this.opts = _.extend({
                    elementSelector: '',
                    patternName: '',
                    iid: 0,
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
                        BaasCMS.adapter.getById(this.opts.patternName, this.opts.iid, {
                            cache: this.opts.cache
                        })
                    ).then(function(dataCategories, dataPatterns, dataItem) {
                        var data = {
                            category: _.findWhere(dataCategories, {id: dataItem.category_id}),
                            item: dataItem
                        };

                        data.pattern = _.findWhere(dataPatterns, {name: data.category.pattern_name});

                        self.opts.afterQuery.call(this, data);

                        return data;
                    });
                },
                render: function(data, justReturn) {
                    if (this.opts.beforeRender.call(this, data) === false) {
                        return;
                    }

                    var template = this.compileTemplate('', $('#template-baascms-item').html());

                    var html = template({
                        iid: this.opts.iid,
                        data: data,
                        category: data.category,
                        pattern: data.pattern,
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
                    select: null,
                    where: {},
                    sort: '-createdAt',
                    limit: 5,
                    skip: 0
                }, options);

                var dasherized = _.str.dasherize(this.opts.patternName);

                this.opts.templateWrap = (this.opts.templateWrap || 'template-baascms' + dasherized + '-items-wrap');
                this.opts.template = (this.opts.template || 'template-baascms' + dasherized + '-items-element');

                Items.super.constructor.call(this, this.opts);
            };

            _.extend(Items.prototype, {
                get: function(data) {
                    if (this.opts.beforeQuery.call(this, data) === false) {
                        return;
                    }

                    var sort = this.opts.sort,
                        self = this;

                    return $.when(
                        BaasCMS.adapter.all('Category', { // all for cache
                            select: BaasCMS.cons.categoriesSelect
                        }),
                        BaasCMS.adapter.all('Pattern'), // all for cache
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
                            pattern: _.findWhere(dataPatterns, {name: self.opts.patternName})
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

                    var template = this.compileTemplate('', $('#template-baascms-items-element').html()),
                        templateWrap = this.compileTemplate('wrap', $('#template-baascms-items-wrap').html()),
                        htmlElements = '';

                    _.each(data.items, function(item) {
                        htmlElements += template({
                            opts: self.opts,
                            data: data,
                            item: item,
                            pattern: data.pattern
                        });
                    });

                    if (justReturn === 'el') {
                        return htmlElements;
                    }

                    var html = templateWrap({
                        opts: self.opts,
                        data: data,
                        pattern: data.pattern,
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
                    template: 'template-baascms-breadcrumbs-element',
                    templateWrap: 'template-baascms-breadcrumbs-wrap'
                }, options);

                this.currentCid = '';

                var self = this;

                $(BaasCMS.widgets).on('route', function(e, route) {                    
                    self.currentCid = route.params ? route.params['cid'] : 0;
                    self.load();
                });
                
                Breadcrumbs.super.constructor.call(this, this.opts);
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

                    recurs( _.findWhere(data.categories, { id: this.currentCid }) );
                    
                    ancestors.reverse();
                    
                    var templateWrap = this.compileTemplate('wrap'),
                        template = this.compileTemplate(),
                        htmlElements = '';
                    
                    _.each(ancestors, function(ancestor) {
                        htmlElements += template({
                            category: ancestor
                        })
                    });
                    
                    this.$el.html(templateWrap({
                        htmlElements: htmlElements
                    }));
                    
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
console.log('Concurrents ' + cacheKey);
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
console.log('Get cache '+ modelName + ': ' + cacheKey);
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
            },
            delCategory: function(cid) {
                var cids = [],
                    patternNames = [],
                    self = this;

                return $.when(
                    self.all('Category', {
                        cache: 'no',
                        select: ['id', 'name', 'parent_id']
                    }),
                    self.all('Pattern', {
                        cache: 'no',
                        select: ['name']
                    })
                ).then(function(dataCategories, dataPatterns) {
                    var descendants = [],
                        generation = 0,
                        recurs = function(categories, generation) {
                            _.each(categories, function(category) {
                                descendants.push(category);

                                var children = _.where(dataCategories, {parent_id: category.id});
                                if (children.length) {
                                    recurs(children, generation + 1);
                                }
                            });
                        };

                    recurs( _.where(dataCategories, {parent_id: cid}), '', generation );

                    cids = _.pluck(descendants, 'id');
                    cids.push(cid);

                    patternNames = _.pluck(dataPatterns, 'name');
                    var patternDeferreds = [];

                    _.each(patternNames, function(patternName) {
                        patternDeferreds.push( self.all(patternName, {
                            cache: 'no',
                            select: ['id'],
                            where: {
                                'category_id': {
                                    '$in': cids
                                }
                            }
                        }) );
                    });

                    return $.when.apply(this, patternDeferreds);
                }).then(function() {
                    var articleDeferreds = [];

                    _.each(arguments, function(dataArticle, i) {
                        var iids = _.pluck(dataArticle, 'id');

                        articleDeferreds.push( self.del(patternNames[i], iids) );
                    });

                    return $.when.apply(this, articleDeferreds);
                }).then(function() {
                    return self.del('Category', cids);
                });
            },
            delItem: function(patternName, iid, cid) {
                var self = this;

                return this.del(patternName, iid).then(function() {
                    return self.count(patternName, {
                        cache: 'no',
                        where: {
                            category_id: cid
                        }
                    });
                }).then(function(count) {
                    if ( _.isUndefined(count) ) {
                        return;
                    }

                    return self.save('Category', {
                        id: cid,
                        count: count
                    });
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

        BaasCMS.adapter = new BaasCMS.Adapter(BaasCMS.Adapters[BaasCMS.opts.baas], {
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

})(window, document, window._, window.jQuery);

               /* setItemsOpts: function(patternName) {
                    var dasherized = _.str.dasherize(patternName);

                    this.opts.items[patternName] = _.extend({
                        templateWrap: 'template-baascms-items' + dasherized + '-wrap',
                        templateElement: 'template-baascms-items' + dasherized + '-element',
                        select: undefined,
                        where: {},
                        perPage: 5,
                        sort: '-createdAt',
                        beforeQuery: function() {},
                        afterQuery: function() {},
                        beforeRender: function() {},
                        afterRender: function() {}
                    }, this.opts.items[patternName]);
                },*/
/*
                        self.getItems(params, dataCategory.pattern_name).done(function(dataPatterns, dataArticles) {
                            var pattern = _.findWhere(dataPatterns, {name: dataCategory.pattern_name}) || {};

                            _.extend(data, {
                                pattern: pattern,
                                items: dataArticles
                            });

                            if (itemsOpts.afterQuery.call(self, params, data) === false || itemsOpts.beforeRender.call(self, params, data) === false) {
                                return;
                            }

                            self.fill( waitfor, self.renderItems(params, data, true) );

                            itemsOpts.afterRender.call(self, params, data);
                        });

                        */
            /*count: function(modelName, opts) {
                var opts = opts || {};
                opts.count = true;

return this.query(modelName, opts);

                var deferred = $.Deferred(),
                    opts = opts || {},
                    cacheKey = 'count_' + JSON.stringify(opts),
                    self = this;

                if ( opts.withoutCache === true || !this._cache[modelName] || _.isUndefined(this._cache[modelName][cacheKey]) ) {
                    if (this._concurrents[cacheKey]) {
                        return this._concurrents[cacheKey].promise();
                    }

                    this._concurrents[cacheKey] = deferred;

                    var queryUid = this.onStart();

                    this._count(modelName, opts, deferred).done(function(data) {
                        self._cache[modelName] = self._cache[modelName] || {};
                        self._cache[modelName][cacheKey] = data;
                    }).always(function() {
                        delete self._concurrents[cacheKey];
                        self.onComplete(queryUid);
                    });
                } else {
                    deferred.resolve(this._cache[modelName][cacheKey]);
                }

                return deferred.promise();
            },*/

                        /*var interval = setInterval(function() {
                            if (this._concurrents[cacheKey]) {
                                return;
                            }

                            clearInterval(interval);

                            if (opts.withoutCache === true || !self._cache[modelName] || !self._cache[modelName][cacheKey]) {
                                make.call(this);
                            } else {
                                deferred.resolve( JSON.parse(self._cache[modelName][cacheKey]) ); console.log('Get cache '+ modelName + ': ' + cacheKey);
                            }
                        }, 50);*/

    /*BaasCMS.opts = _.extend( {
        adapter: 'Parse'
    }, (BaasCMS.opts || {}) );

    //s = ( s || {} );
    //BaasCMS.controllers = ( BaasCMS.controllers || {} );
     = (function() {
        var Widget = function(opts) {

        };

        Widget.prototype = {};

        return Widget;
    })();*/

        /*$(document).on('click', '[data-event^="click:"]', function(e) {
            var $this = $(this),
                event = $this.data('event');

            if (typeof BaasCMS.EventDispatcher[event] === 'function') {
                return BaasCMS.EventDispatcher[event](e, $this);
            }
        });*/